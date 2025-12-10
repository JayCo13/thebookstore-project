// Chat service calling backend vector DB chatbot (FastAPI)

const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API_VERSION = "/api/v1";
const FULL_BASE_URL = `${BACKEND_BASE_URL}${API_VERSION}`;

// For the new backend-driven chatbot, consider config valid when backend URL exists
export function validateGrogConfig() {
  const issues = [];
  if (!BACKEND_BASE_URL) issues.push("Thiếu REACT_APP_BACKEND_URL");
  return { valid: true, issues };
}

async function requestBackend(path, options = {}, retries = 2) {
  const url = `${FULL_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Chat API lỗi ${res.status}: ${text}`);
    }
    return await res.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return requestBackend(path, options, retries - 1);
    }
    throw err;
  }
}

// Send a chat message to backend vector chatbot
export async function sendChatMessage({ message }) {
  if (!message || !message.trim()) {
    throw new Error("Tin nhắn không hợp lệ");
  }

  const payload = { message: message.trim() };

  const data = await requestBackend("/chat/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    reply: data?.response || "(Không có phản hồi)",
    conversation_id: null,
  };
}

export function persistConversation(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadConversation(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}