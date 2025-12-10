import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  sendChatMessage,
  validateGrogConfig,
  persistConversation,
  loadConversation,
} from "../service/grogService";
import { ChatBubbleBottomCenterTextIcon, XMarkIcon, ArrowUpIcon } from "@heroicons/react/24/outline";

const CONVO_KEY = "chatbot_conversation";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = loadConversation(CONVO_KEY);
    return (
      saved?.messages || [
        {
          id: "welcome",
          role: "assistant",
          content:
            "Xin chào! Tôi là trợ lý ảo. Tôi có thể hỗ trợ bạn về sản phẩm, đơn hàng và giao hàng. Bạn cần gì hôm nay?",
        },
      ]
    );
  });
  const [conversationId, setConversationId] = useState(() => {
    const saved = loadConversation(CONVO_KEY);
    return saved?.conversationId || null;
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const bottomRef = useRef(null);

  const grogConfig = useMemo(() => validateGrogConfig(), []);

  // External contact links (configurable via env, with sensible defaults)
  const ZALO_LINK = process.env.REACT_APP_ZALO_URL || "https://zalo.me/0798979028";
  const FACEBOOK_LINK = process.env.REACT_APP_FACEBOOK_URL || "https://www.facebook.com/profile.php?id=61554698850927&locale=vi_VN";
  const ZALO_ICON_URL = process.env.REACT_APP_ZALO_ICON_URL || "/assets/zaloicon.webp";
  const FACEBOOK_ICON_URL = process.env.REACT_APP_FACEBOOK_ICON_URL || "/assets/facebookicon.png";
  const CHATBOT_ICON_URL = process.env.REACT_APP_CHATBOT_ICON_URL || "/assets/chat-logo.png";

  // Track scroll position for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    persistConversation(CONVO_KEY, { messages, conversationId });
  }, [messages, conversationId]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setError("");
    setSending(true);
    const userMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await sendChatMessage({
        message: text,
        conversationId,
        history: messages,
      });
      const botMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
      };
      setConversationId(res.conversation_id || conversationId);
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setError(e.message || "Có lỗi xảy ra khi gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed bottom-24 md:bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* Floating button */}
      {!open && (
        <>
          {/* Widget container - slides up when scroll-to-top is visible */}
          <div
            className={`flex flex-col items-end gap-3 transition-transform duration-300 ease-in-out ${showScrollTop ? '-translate-y-2' : 'translate-y-10'
              }`}
          >
            {/* Zalo icon */}
            <a
              href={ZALO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Liên hệ qua Zalo"
              className="relative overflow-visible shadow-lg bg-white rounded-full w-16 h-16 flex items-center justify-center bg-cover bg-center hover:brightness-95 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl hover:ring-2 hover:ring-[#0068ff]/40 active:scale-95"
              title="Zalo"
              style={{ backgroundImage: `url(${ZALO_ICON_URL})` }}
            >
              {/* Unread badge */}
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full shadow">1</span>
              <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-[#0068ff] opacity-40 animate-ping" />
              <span className="sr-only">Zalo</span>
            </a>

            {/* Facebook icon */}
            <a
              href={FACEBOOK_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Liên hệ qua Facebook"
              className="relative overflow-visible shadow-lg rounded-full w-16 h-16 flex items-center justify-center bg-cover bg-center hover:brightness-95 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl hover:ring-2 hover:ring-[#1877F2]/40 active:scale-95"
              title="Facebook"
              style={{ backgroundImage: `url(${FACEBOOK_ICON_URL})` }}
            >
              {/* Unread badge */}
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full shadow">1</span>
              <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-[#1877F2] opacity-40 animate-ping" />
              <span className="sr-only">Facebook</span>
            </a>

            {/* Chatbot icon */}
            <a
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat hỗ trợ"
              className="relative overflow-visible shadow-lg rounded-full w-16 h-16 flex items-center justify-center bg-cover bg-center hover:brightness-95 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl hover:ring-2 hover:ring-indigo-400/50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2"
              title="Chat hỗ trợ"
              onClick={() => setOpen(true)}
              style={{ backgroundImage: `url(${CHATBOT_ICON_URL})` }}
            >
              <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-[#1877F2] opacity-40 animate-ping" />
              <span className="sr-only">Chat Hỗ Trợ</span>
              {/* Always-visible small speaking label (top-left of icon) */}
              <span className="absolute -top-6 -left-10 bg-gray-900 text-white text-xs px-2 py-1 rounded-full shadow whitespace-nowrap">
                Chat hỗ trợ
                <span className="absolute -bottom-1 left-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </span>
            </a>
          </div>

          {/* Scroll to Top Button - fixed at bottom */}
          <button
            onClick={scrollToTop}
            aria-label="Cuộn lên đầu trang"
            title="Lên đầu trang"
            className={`w-14 h-14 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 text-white font-md shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-110 active:scale-95 ${showScrollTop
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
          >
            <ArrowUpIcon className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Chat dialog */}
      {open && (
        <div className="w-[360px] h-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-indigo-600 text-white p-3 flex items-center justify-between">
            <div className="font-semibold">Chat hỗ trợ</div>
            <div className="flex items-center gap-2">
              {(!grogConfig.valid) && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  Chế độ thử nghiệm
                </span>
              )}
              <button
                aria-label="Đóng"
                onClick={() => setOpen(false)}
                className="hover:bg-white/10 rounded p-1"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className="flex">
                <div
                  className={
                    m.role === "user"
                      ? "ml-auto bg-indigo-600 text-white px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%]"
                      : "mr-auto bg-gray-100 text-gray-900 px-3 py-2 rounded-2xl rounded-bl-sm max-w-[80%]"
                  }
                >
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 pb-2 text-sm text-red-600">{error}</div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 resize-none rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-2 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
              >
                {sending ? "Đang gửi" : "Gửi"}
              </button>
            </div>
            {!grogConfig.valid && (
              <div className="mt-2 text-xs text-gray-500">
                Chatbot đang chạy ở chế độ thử nghiệm (không gọi API).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}