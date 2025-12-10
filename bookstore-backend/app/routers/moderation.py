from fastapi import APIRouter, HTTPException, status
from app.schemas.schemas import ModerationRequest, ModerationResponse
from app.config import settings
from typing import List
from groq import Groq
import json
import re
import logging

router = APIRouter(prefix="/moderation", tags=["Moderation"]) 
logger = logging.getLogger(__name__)


def _init_groq_client():
    try:
        # Prefer dedicated moderation key if provided, otherwise fall back to general key
        if getattr(settings, "groq_api_key_mod", None):
            return Groq(api_key=settings.groq_api_key_mod)
        if getattr(settings, "groq_api_key", None):
            return Groq(api_key=settings.groq_api_key)
    except Exception as e:
        logger.warning(f"Groq client init failed: {e}")
    return None


def _build_system_prompt():
    return (
        "Bạn là hệ thống kiểm duyệt nội dung bình luận sản phẩm. "
        "Nhiệm vụ: đánh giá văn bản có chứa từ ngữ thô tục, thù hằn, tình dục, miệt thị, xúc phạm rõ ràng, spam, hoặc vi phạm chính sách khác. "
        "Xem xét cả tiếng Việt và tiếng Anh (bao gồm các cách viết thiếu dấu/biến đổi, leetspeak). "
        "YÊU CẦU: Trả về CHỈ JSON thô, không markdown, không backticks, không chú thích. "
        "Trường JSON: approved (boolean), flags (mảng chuỗi ngắn), severity (low|medium|high), reason (tóm tắt ngắn). "
        "Hãy viết trường 'reason' bằng TIẾNG VIỆT. Nếu có thể, dùng tiếng Việt cho các phần tử trong 'flags'. "
        "Nếu là trường hợp ranh giới/nhẹ, đặt severity='low' và approved=true; nếu vi phạm rõ ràng, đặt approved=false."
    )


def _build_user_prompt(req: ModerationRequest) -> str:
    rating = req.rating if req.rating is not None else "unknown"
    lang = req.language or "auto"
    return (
        f"Language={lang}; Rating={rating}; Review Text: "
        f"""{req.text}"""
    )


def _extract_json(text: str):
    """Try to robustly extract a JSON object from model output.
    Handles fenced code blocks, leading language tags and trailing commentary.
    """
    if not text:
        return None
    s = text.strip()
    # Remove typical markdown code fences
    if '```' in s:
        # Take the first fenced block content
        parts = s.split('```')
        # parts like [before, maybe 'json\n{...}', after]
        for part in parts:
            candidate = part.strip()
            # Drop language hint like 'json' at the start
            if candidate.lower().startswith('json'):
                candidate = candidate[len('json'):].strip()
            # Try parse if it looks like JSON
            if candidate.startswith('{') and candidate.endswith('}'):
                try:
                    return json.loads(candidate)
                except Exception:
                    pass
        # If not found, fall back to brace extraction below

    # Fallback: extract substring between first '{' and last '}'
    start = s.find('{')
    end = s.rfind('}')
    if start != -1 and end != -1 and end > start:
        candidate = s[start:end+1]
        try:
            return json.loads(candidate)
        except Exception:
            pass
    # As a last resort, try regex to find a JSON-looking block
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        candidate = m.group(0)
        try:
            return json.loads(candidate)
        except Exception:
            pass
    return None


@router.post("/review", response_model=ModerationResponse)
async def moderate_review(payload: ModerationRequest) -> ModerationResponse:
    """Moderate a review using server-side AI. Requires server Groq key configured."""
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cần có nội dung đánh giá")

    client = _init_groq_client()
    if client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dịch vụ kiểm duyệt AI không khả dụng")

    # Compose a chat completion request
    messages = [
        {"role": "system", "content": _build_system_prompt()},
        {"role": "user", "content": _build_user_prompt(payload)},
    ]

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.0,
            max_tokens=256,
        )
        content = completion.choices[0].message.content if completion and completion.choices else "{}"
    except Exception as e:
        logger.error(f"Groq moderation error: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Lỗi nhà cung cấp kiểm duyệt")

    # Parse JSON response from the model (robust to fenced output)
    try:
        data = _extract_json(content)
        if data is None:
            raise ValueError("No JSON object could be extracted")
        approved = bool(data.get("approved", False))
        flags = data.get("flags", [])
        if not isinstance(flags, list):
            flags = [str(flags)]
        severity = data.get("severity")
        reason = data.get("reason")
        return ModerationResponse(approved=approved, flags=[str(f) for f in flags], severity=severity, reason=reason)
    except Exception as e:
        logger.warning(f"Failed to parse moderation JSON: {e}; content={content!r}")
        # Conservative fallback when parsing fails
        return ModerationResponse(
            approved=False,
            flags=["không_thể_phân_tích_phản_hồi"],
            severity="medium",
            reason="Không thể phân tích phản hồi kiểm duyệt"
        )