// Chat service — calls the Supabase `chat` Edge Function (replaces FastAPI /chat).
import { supabase } from './supabaseClient';

export function validateGrogConfig() {
  return { valid: true, issues: [] };
}

// Send a chat message to the Supabase chat function. Keeps the {reply, conversation_id}
// contract the ChatbotWidget expects; uses session_id for conversation continuity.
export async function sendChatMessage({ message, conversationId } = {}) {
  if (!message || !message.trim()) {
    throw new Error("Tin nhắn không hợp lệ");
  }
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { message: message.trim(), session_id: conversationId || null },
  });
  if (error) {
    throw new Error(error.message || "Chat lỗi, vui lòng thử lại.");
  }
  return {
    reply: data?.response || "(Không có phản hồi)",
    conversation_id: data?.session_id || conversationId || null,
  };
}

export function persistConversation(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { }
}

export function loadConversation(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}