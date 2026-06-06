-- =============================================================================
-- Chatbot session state — replaces the Redis keys used by routers/chat.py
-- (chat_history / chat_context / chat_shipping). Touched only by the `chat`
-- Edge Function (service_role); no anon/authenticated access.
-- =============================================================================
create table public.chat_sessions (
    session_id   text primary key,
    history      jsonb not null default '[]'::jsonb,   -- [{role, content}, ...]
    shipping_ctx jsonb not null default '{}'::jsonb,    -- GHN fee gathering state
    updated_at   timestamptz default now()
);

alter table public.chat_sessions enable row level security;
-- No policies: only service_role (the chat function) may read/write.

create trigger trg_chat_sessions_updated_at
    before update on public.chat_sessions
    for each row execute function public.set_updated_at();
