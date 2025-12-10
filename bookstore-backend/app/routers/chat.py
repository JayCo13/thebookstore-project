from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db, get_redis
from app.schemas.schemas import ChatRequest, ChatResponse
from app.config import settings
from app.models.models import Book, Category, Stationery
from app.services.ghn_service import GHNService
from app.cache.redis_cache import RedisCache, CacheKeys
from redis import Redis
import uuid

import chromadb
from sentence_transformers import SentenceTransformer
from groq import Groq
import re
import logging
import unicodedata
from typing import Optional, Dict, Any

router = APIRouter(prefix="/chat", tags=["Chatbot"]) 
logger = logging.getLogger(__name__)


# Initialize global resources once
try:
    print(f"[chat.py] GROQ key present? {bool(settings.groq_api_key)}")
    if settings.groq_api_key:
        groq_client = Groq(api_key=settings.groq_api_key)
        logger.info("Groq client initialized (API key present)")
    else:
        groq_client = None
        logger.info("Groq client disabled (no API key)")
except Exception as e:
    logger.warning(f"Groq client initialization failed: {e}")
    groq_client = None

embedding_model = None
book_collection = None

STRICT_SYSTEM_PROMPT = (
    "Bạn là trợ lý hỗ trợ khách hàng cho cửa hàng Tâm Nguồn - chuyên bán sách, văn phòng phẩm, dụng cụ yoga và các sản phẩm tâm linh.\n"
    "Bạn PHẢI trả lời bằng tiếng Việt, tự nhiên và thân thiện.\n"
    "Sử dụng khối Ngữ cảnh được cung cấp để lấy dữ kiện; KHÔNG bịa thông tin.\n"
    "Tuyệt đối KHÔNG nhắc tới hay hiển thị các nhãn như [CONTEXT] hoặc nội dung của khối ngữ cảnh trong câu trả lời; chỉ trả lời bằng ngôn ngữ tự nhiên.\n"
    "Bạn có thể dùng lịch sử hội thoại để hiểu chủ đề, ngữ cảnh và tham chiếu (ví dụ: 'cái đó', 'cho tôi thông tin với'), nhưng mọi dữ kiện phải đến từ Ngữ cảnh.\n"
    "Nếu câu hỏi mơ hồ, KHÔNG yêu cầu người dùng xác nhận lại; hãy chủ động tóm tắt ngắn gọn thông tin hữu ích theo đúng chủ đề đang nói tới, rồi gợi ý các hướng hỏi tiếp theo.\n"
    "Nếu người dùng hỏi về mua hàng, thanh toán, giao hàng/đơn vị vận chuyển, theo dõi đơn, đổi trả/bảo hành, hoặc liên hệ hỗ trợ: hãy đưa ra hướng dẫn theo quy trình chung của website (chọn sản phẩm → thêm vào giỏ → tiến hành thanh toán → đăng nhập/khách → nhập địa chỉ → chọn phương thức giao → xem phí hiển thị → xác nhận đơn và nhận email), nêu các bước rõ ràng và các gợi ý tiếp theo. Không bịa chi tiết cụ thể như chính sách, giá, số điện thoại hay email nếu chưa có trong Ngữ cảnh; trong trường hợp thiếu, hãy hướng người dùng đến mục \"Đơn hàng\" hoặc \"Liên hệ\" trên website.\n"
    "ĐẶC BIỆT: Với các câu hỏi thuộc nhóm hướng dẫn (mua hàng, thanh toán, giao hàng, theo dõi đơn, đổi trả/bảo hành, hỗ trợ), bạn vẫn phải trả lời hướng dẫn chung ngay cả khi Ngữ cảnh không có dữ liệu liên quan. Trả lời bằng các bước ngắn gọn, dễ làm theo, và gợi ý hành động tiếp theo.\n"
    "Khi người dùng hỏi 'shop bán gì' hoặc 'có những sản phẩm gì': hãy tổng hợp từ Ngữ cảnh và trả lời đầy đủ về các loại sản phẩm (sách, văn phòng phẩm, dụng cụ yoga, v.v.).\n"
    "Khi người dùng hỏi về một danh mục hoặc sản phẩm không có trong danh sách khả dụng: hãy trả lời lịch sự: \"Rất tiếc, cửa hàng hiện chưa có [sản phẩm] bạn hỏi. Tuy nhiên, chúng tôi có nhiều sản phẩm thú vị khác như: ...\" rồi gợi ý vài sản phẩm liên quan.\n"
    "Khi người dùng hỏi 'phí vận chuyển/tiền ship': nếu chưa đủ thông tin, hãy hỏi tự nhiên: 'Bạn ở tỉnh/thành, quận/huyện, phường/xã nào?' và 'Bạn muốn mua sản phẩm nào, số lượng bao nhiêu?' (nếu có cân nặng/kích thước ước tính thì càng tốt). Sau khi có đủ dữ liệu, trả lời mức phí và giải thích ngắn gọn.\n"
    "Nếu không tìm thấy câu trả lời trong Ngữ cảnh, hãy trả lời: \"Tôi không tìm thấy thông tin này, bạn có thể hỏi câu khác được không?\""
)


def _ensure_vector_resources():
    """Lazy-load embedding model and Chroma collection."""
    global embedding_model, book_collection
    if embedding_model is None:
        embedding_model = SentenceTransformer("dangvantuan/vietnamese-embedding")
    if book_collection is None:
        chroma_client = chromadb.PersistentClient(path=settings.chroma_db_path)
        # Assume collection already created by embed_data.py
        try:
            book_collection = chroma_client.get_collection(name="books")
        except Exception:
            # If not found, create an empty collection so the endpoint still works
            book_collection = chroma_client.create_collection(name="books")


def _format_vnd(amount: int) -> str:
    try:
        return f"{int(amount):,}".replace(",", ".") + " đ"
    except Exception:
        return str(amount)


def _parse_shipping_params(text: str) -> dict:
    """Parse simple key=value pairs from user text for GHN fee calculation."""
    pairs = re.findall(r"(?i)\b([a-z_]+)\s*=\s*([\w-]+)\b", text)
    raw = {k.lower(): v for k, v in pairs}
    mapping = {
        "to_district_id": ["to_district_id", "district_id"],
        "to_ward_code": ["to_ward_code", "ward_code"],
        "from_district_id": ["from_district_id"],
        "from_ward_code": ["from_ward_code"],
        "service_type_id": ["service_type_id", "service"],
        "weight": ["weight", "can_nang"],
        "length": ["length"],
        "width": ["width"],
        "height": ["height"],
        "insurance_value": ["insurance_value", "bao_hiem"],
    }
    params = {}
    for key, keys in mapping.items():
        for k in keys:
            if k in raw:
                params[key] = raw[k]
                break
    for num_key in ["to_district_id", "service_type_id", "weight", "length", "width", "height", "insurance_value", "from_district_id"]:
        if num_key in params:
            try:
                params[num_key] = int(params[num_key])
            except Exception:
                pass
    return params

def _strip_accents(text: str) -> str:
    try:
        return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    except Exception:
        return text

def _normalize_vi(text: str) -> str:
    if not text:
        return ""
    text = str(text).lower().strip()
    text = _strip_accents(text)
    return " ".join(text.split())

async def _extract_location(ctx: Dict[str, Any], text: str, ghn_service: GHNService) -> Dict[str, Any]:
    """Update ctx with province/district/ward by accent-insensitive matching against GHN master data."""
    norm = _normalize_vi(text)
    ctx = dict(ctx or {})
    # Province
    if not ctx.get("province_id"):
        prov = await ghn_service.find_province(norm)
        if prov:
            ctx["province_id"] = prov.get("ProvinceID")
            ctx["province"] = prov.get("ProvinceName")
    # District
    if ctx.get("province_id") and not ctx.get("district_id"):
        # Try to remove province tokens from norm to improve district matching
        prov_name = _normalize_vi(ctx.get("province", ""))
        q_for_dist = norm.replace(prov_name, "").strip() or norm
        dist = await ghn_service.find_district(ctx["province_id"], q_for_dist)
        if dist:
            ctx["district_id"] = dist.get("DistrictID")
            ctx["district"] = dist.get("DistrictName")
    # Ward
    if ctx.get("district_id") and not ctx.get("to_ward_code"):
        # Further strip district tokens
        dist_name = _normalize_vi(ctx.get("district", ""))
        q_for_ward = norm.replace(dist_name, "").strip() or norm
        ward = await ghn_service.find_ward(ctx["district_id"], q_for_ward)
        if ward:
            ctx["to_ward_code"] = ward.get("WardCode")
            ctx["ward"] = ward.get("WardName")
    # Map ward/district into GHN fee params keys
    if ctx.get("district_id"):
        ctx["to_district_id"] = ctx["district_id"]
    return ctx

def _extract_quantity(ctx: Dict[str, Any], text: str) -> Dict[str, Any]:
    ctx = dict(ctx or {})
    m = re.search(r"(?i)(\d+)\s*(cuon|quyen|quy?n)?", text)
    if m:
        try:
            ctx["quantity"] = int(m.group(1))
        except Exception:
            pass
    return ctx

def _extract_book_title(ctx: Dict[str, Any], text: str, db: Session) -> Dict[str, Any]:
    ctx = dict(ctx or {})
    norm = _normalize_vi(text)
    # Heuristic: try to find a title whose normalized form appears in the text or vice versa
    try:
        candidates = db.query(Book).limit(200).all()
        best_title = None
        best_score = 0
        tokens = set(norm.split())
        for b in candidates:
            tnorm = _normalize_vi(getattr(b, "title", ""))
            if not tnorm:
                continue
            title_tokens = set(tnorm.split())
            score = len(tokens & title_tokens)
            if (tnorm in norm) or (norm in tnorm) or score > best_score:
                best_title = b.title
                best_score = score
        if best_title:
            ctx["book_title"] = best_title
    except Exception:
        pass
    return ctx


@router.post("/", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Answer user message using vector DB retrieval and Groq completion."""
    if not chat_request.message or not chat_request.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required")

    # Ensure resources
    _ensure_vector_resources()

    cache = RedisCache(redis)

    # Determine session id (prefer provided; otherwise derive; else generate)
    session_id = (chat_request.session_id or
                  request.headers.get("X-Session-Id") or
                  (request.client.host if request and request.client else None) or
                  uuid.uuid4().hex)

    user_question = chat_request.message.strip()

    # Step 1: Embed user question
    try:
        question_embedding = embedding_model.encode(user_question).tolist()
    except Exception:
        return ChatResponse(response="Đã có lỗi xảy ra khi xử lý câu hỏi, vui lòng thử lại.")

    # Step 2: Query Chroma for top matches
    try:
        results = book_collection.query(query_embeddings=[question_embedding], n_results=5)
    except Exception:
        results = {"ids": [], "metadatas": [[]]}

    book_ids = []
    if results.get("metadatas") and len(results["metadatas"]) > 0:
        for meta in results["metadatas"][0]:
            if isinstance(meta, dict) and meta.get("book_id") is not None:
                book_ids.append(meta["book_id"])

    # Step 3: Fetch latest data from MySQL via SQLAlchemy
    context_text = ""
    try:
        books = []
        if book_ids:
            books = db.query(Book).filter(Book.book_id.in_(book_ids)).all()
        else:
            # Heuristic fallback: nếu không có kết quả từ vector DB, thử theo từ khóa
            q_lower = user_question.lower()
            if "giảm giá" in q_lower:
                books = db.query(Book).filter(getattr(Book, "is_discount", False) == True).limit(10).all()

            # Follow-up heuristic: nếu câu hỏi chung chung, dùng context của phiên trước
            generic_followup = any(kw in q_lower for kw in ["thông tin", "chi tiết", "với", "nữa", "tiếp"]) and not any(
                kw in q_lower for kw in ["sách", "yoga", "giảm giá", "giá", "tồn kho", "tác giả", "thể loại"]
            )
            if generic_followup and not books:
                previous_context = await cache.get(CacheKeys.chat_context(session_id))
                if previous_context:
                    context_text = previous_context

        if books:
            context_lines = ["Dưới đây là dữ liệu sách từ cơ sở dữ liệu:"]
            for b in books:
                title = getattr(b, "title", "(không có tiêu đề)")
                price = getattr(b, "price", None)
                stock = getattr(b, "stock_quantity", None)
                description = getattr(b, "description", "")
                discounted_price = getattr(b, "discounted_price", None)
                context_lines.append(
                    f"- Sách: {title}, Giá: {price}, Giá giảm: {discounted_price}, Tồn kho: {stock}, Mô tả: {description}"
                )
            context_text = "\n".join(context_lines)
            # Lưu context cho phiên để phục vụ câu hỏi nối tiếp
            await cache.set(CacheKeys.chat_context(session_id), context_text, ttl=1800)
        elif not context_text:
            context_text = "Không tìm thấy sản phẩm nào liên quan."
        
        # Add stationery data to context
        try:
            stationery_items = db.query(Stationery).limit(100).all()
            if stationery_items:
                stationery_lines = ["Dữ liệu văn phòng phẩm/dụng cụ yoga:"]
                for s in stationery_items:
                    title = getattr(s, "title", "(không có tiêu đề)")
                    price = getattr(s, "price", None)
                    stock = getattr(s, "stock_quantity", None)
                    description = getattr(s, "description", "")[:100] if getattr(s, "description", None) else ""
                    discounted_price = getattr(s, "discounted_price", None)
                    stationery_lines.append(
                        f"- Sản phẩm: {title}, Giá: {price}, Giá giảm: {discounted_price}, Tồn kho: {stock}, Mô tả: {description}"
                    )
                context_text = context_text + "\n\n" + "\n".join(stationery_lines)
        except Exception as e:
            logger.debug(f"Error fetching stationery: {e}")
        
        # Bổ sung danh mục và tiêu đề sản phẩm khả dụng vào ngữ cảnh
        try:
            categories = db.query(Category).limit(200).all()
            category_names = ", ".join([c.name for c in categories if getattr(c, "name", None)])
        except Exception:
            category_names = ""
        try:
            all_books = db.query(Book).limit(300).all()
            book_titles = ", ".join([b.title for b in all_books if getattr(b, "title", None)])
        except Exception:
            book_titles = ""
        try:
            all_stationery = db.query(Stationery).limit(200).all()
            stationery_titles = ", ".join([s.title for s in all_stationery if getattr(s, "title", None)])
        except Exception:
            stationery_titles = ""
        extra_lines = []
        if category_names:
            extra_lines.append(f"Danh mục khả dụng: {category_names}")
        if book_titles:
            extra_lines.append(f"Tiêu đề sách khả dụng: {book_titles}")
        if stationery_titles:
            extra_lines.append(f"Văn phòng phẩm/Yoga khả dụng: {stationery_titles}")
        
        # Add shop info summary
        extra_lines.append("Cửa hàng Tâm Nguồn chuyên bán: Sách (tâm linh, phát triển bản thân, yoga), Văn phòng phẩm, Dụng cụ tập yoga, và các sản phẩm tâm linh khác.")
        
        if extra_lines:
            context_text = (context_text + "\n\n" + "\n".join(extra_lines)).strip()
    except Exception:
        context_text = "Không tìm thấy sản phẩm nào liên quan."

    # Nếu người dùng hỏi về phí vận chuyển và đã cung cấp đủ tham số, tính phí GHN trực tiếp
    q_lower = user_question.lower()
    shipping_keywords = ["phí vận chuyển", "tiền ship", "phí ship", "shipping fee", "ship"]
    intent = any(kw in q_lower for kw in shipping_keywords)
    # Load existing shipping context
    shipping_ctx = await cache.get(CacheKeys.chat_shipping(session_id)) or {}
    if intent or shipping_ctx.get("intent_active"):
        ghn_service = GHNService()
        if not ghn_service.is_configured():
            return ChatResponse(response="Hệ thống GHN chưa cấu hình. Vui lòng thử lại sau.")
        # Mark intent active
        shipping_ctx["intent_active"] = True
        # Parse any explicit key=value params first (tech-savvy users)
        params = _parse_shipping_params(user_question)
        shipping_ctx.update(params)
        # Natural language extraction
        shipping_ctx = await _extract_location(shipping_ctx, user_question, ghn_service)
        shipping_ctx = _extract_quantity(shipping_ctx, user_question)
        shipping_ctx = _extract_book_title(shipping_ctx, user_question, db)

        # Decide next action
        if shipping_ctx.get("to_district_id") and shipping_ctx.get("to_ward_code"):
            # Compute fee
            fee_params = {
                "to_district_id": shipping_ctx["to_district_id"],
                "to_ward_code": shipping_ctx["to_ward_code"],
                "service_type_id": shipping_ctx.get("service_type_id", 2),
                "weight": shipping_ctx.get("weight", 500),
                "length": shipping_ctx.get("length", 20),
                "width": shipping_ctx.get("width", 15),
                "height": shipping_ctx.get("height", 10),
                "insurance_value": shipping_ctx.get("insurance_value", 0),
            }
            fee = await ghn_service.calculate_shipping_fee(fee_params)
            if fee:
                total = _format_vnd(fee.get("total")) if fee.get("total") is not None else "N/A"
                service_fee = _format_vnd(fee.get("service_fee")) if fee.get("service_fee") is not None else "0 đ"
                insurance_fee = _format_vnd(fee.get("insurance_fee", 0))
                loc_parts = []
                if shipping_ctx.get("ward"):
                    loc_parts.append(shipping_ctx["ward"])
                if shipping_ctx.get("district"):
                    loc_parts.append(shipping_ctx["district"])
                if shipping_ctx.get("province"):
                    loc_parts.append(shipping_ctx["province"])
                loc_text = ", ".join(loc_parts) if loc_parts else "địa chỉ của bạn"
                qty_text = f" cho {shipping_ctx['quantity']} cuốn" if shipping_ctx.get("quantity") else ""
                title_text = f" ({shipping_ctx['book_title']})" if shipping_ctx.get("book_title") else ""
                ai_response = (
                    f"Phí vận chuyển dự kiến đến {loc_text}{qty_text}{title_text}: {total} (phí dịch vụ: {service_fee}, phí bảo hiểm: {insurance_fee}). "
                    f"Bạn có thể tiếp tục thanh toán để xác nhận mức phí hiển thị ở bước giao hàng."
                )
                # Persist history and clear intent
                try:
                    history = await cache.get_list(CacheKeys.chat_history(session_id))
                except Exception:
                    history = []
                new_history = (history or []) + [
                    {"role": "user", "content": user_question},
                    {"role": "assistant", "content": ai_response},
                ]
                await cache.set_list(CacheKeys.chat_history(session_id), new_history, ttl=3600)
                # Save context for potential follow-ups
                await cache.set(CacheKeys.chat_shipping(session_id), shipping_ctx, ttl=900)
                return ChatResponse(response=ai_response, session_id=session_id)
            else:
                await cache.set(CacheKeys.chat_shipping(session_id), shipping_ctx, ttl=900)
                return ChatResponse(response="Không tính được phí lúc này, bạn vui lòng thử lại sau.", session_id=session_id)
        else:
            # Ask for the missing fields in a friendly way
            missing_bits = []
            if not shipping_ctx.get("province_id"):
                missing_bits.append("tỉnh/thành")
            if shipping_ctx.get("province_id") and not shipping_ctx.get("district_id"):
                missing_bits.append("quận/huyện")
            if shipping_ctx.get("district_id") and not shipping_ctx.get("to_ward_code"):
                missing_bits.append("phường/xã")
            ask_loc = "; ".join(missing_bits) if missing_bits else "tỉnh/thành, quận/huyện, phường/xã"
            ask_extra = []
            if not shipping_ctx.get("book_title"):
                ask_extra.append("bạn muốn mua sách nào")
            if not shipping_ctx.get("quantity"):
                ask_extra.append("số lượng bao nhiêu")
            extra_text = "; ".join(ask_extra)
            prompt = (
                f"Bạn vui lòng cho mình biết {ask_loc}? "
                + (f"Ngoài ra, {extra_text}? " if extra_text else "")
                + "Nếu có cân nặng/kích thước ước tính của kiện hàng thì càng tốt."
            )
            # Persist history and context
            try:
                history = await cache.get_list(CacheKeys.chat_history(session_id))
            except Exception:
                history = []
            new_history = (history or []) + [
                {"role": "user", "content": user_question},
                {"role": "assistant", "content": prompt},
            ]
            await cache.set_list(CacheKeys.chat_history(session_id), new_history, ttl=3600)
            await cache.set(CacheKeys.chat_shipping(session_id), shipping_ctx, ttl=900)
            return ChatResponse(response=prompt, session_id=session_id)

    # Step 4: Call Groq for answer generation
    # Create client lazily at request-time if not already initialized
    local_groq_client = groq_client or (Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None)
    if not local_groq_client:
        # Fallback if Groq not configured: trả lời dựa trên dữ liệu từ DB
        if context_text and context_text.strip():
            return ChatResponse(response=context_text)
        else:
            return ChatResponse(response="Tôi không tìm thấy thông tin này, bạn có thể hỏi câu khác được không?")

    # Load conversation history for this session
    try:
        history = await cache.get_list(CacheKeys.chat_history(session_id))
    except Exception:
        history = []

    user_prompt_for_groq = (
        f"Ngữ cảnh tham khảo:\n{context_text}\n\n"
        f"Nếu câu hỏi mơ hồ hoặc không chỉ rõ chủ đề, hãy tóm tắt ngắn gọn thông tin quan trọng và hữu ích theo chủ đề gần nhất đang được trao đổi.\n"
        f"Dựa *chỉ* trên Ngữ cảnh ở trên, hãy trả lời câu hỏi sau của người dùng (trả lời tự nhiên, không nhắc tới ngữ cảnh):\n{user_question}"
    )

    try:
        messages_payload = [{"role": "system", "content": STRICT_SYSTEM_PROMPT}]
        # Append previous history (limit to last 10 messages for brevity)
        if history:
            for m in history[-10:]:
                # Ensure minimal shape
                role = m.get("role")
                content = m.get("content")
                if role in ("user", "assistant") and content:
                    messages_payload.append({"role": role, "content": content})
        # Current user turn
        messages_payload.append({"role": "user", "content": user_prompt_for_groq})

        completion = local_groq_client.chat.completions.create(
            messages=messages_payload,
            model="llama-3.1-8b-instant",
            temperature=0.1,
        )
        ai_response = completion.choices[0].message.content
        # Sanitize any accidental CONTEXT markers to ensure natural output
        ai_response = re.sub(r"\[/?CONTEXT\]", "", ai_response, flags=re.IGNORECASE).strip()
        # Persist updated history
        new_history = (history or []) + [
            {"role": "user", "content": user_question},
            {"role": "assistant", "content": ai_response},
        ]
        await cache.set_list(CacheKeys.chat_history(session_id), new_history, ttl=3600)
        return ChatResponse(response=ai_response, session_id=session_id)
    except Exception:
        return ChatResponse(response="Đã có lỗi xảy ra, vui lòng thử lại.", session_id=session_id)