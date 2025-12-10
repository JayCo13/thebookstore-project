Chatbot (Vietnamese) with Grog API

Environment Variables (frontend .env)
- `REACT_APP_GROG_API_URL`: Base URL for the Grog chat API, e.g. `https://api.grog.example.com`
- `REACT_APP_GROG_API_KEY`: API key used for `Authorization: Bearer ...`

Behavior
- If env vars are missing, the widget shows a “Chế độ thử nghiệm” badge and replies locally with a Vietnamese fallback message.
- Messages and `conversation_id` persist to `localStorage` under key `chatbot_conversation`.
- The widget is globally mounted in `src/App.js` and appears as a floating button at bottom-right.

API Contract (expected)
- POST `REACT_APP_GROG_API_URL + /chat`
  - Payload: `{ conversation_id?, messages: [{role, content}], options: { language: "vi" } }`
  - Response: `{ reply: string, conversation_id: string }`

Files
- `src/components/ChatbotWidget.jsx`: UI widget
- `src/service/grogService.js`: API integration and config validation

Styling
- Tailwind classes are used for layout and colors; adjust if your project styling differs.