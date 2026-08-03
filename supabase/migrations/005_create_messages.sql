-- 005_create_messages.sql
-- Messages table: stores individual chat messages within a conversation.
-- The last 6 messages (3 user + 3 assistant) are included in each
-- LLM prompt for conversation context.
--
-- Messages are immutable — once written, they should not be updated.
-- The `created_at` timestamp provides ordering.

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- Role: who sent this message
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),

  -- Message content
  content         TEXT NOT NULL,

  -- Message type (for rendering different UI components)
  message_type    TEXT NOT NULL DEFAULT 'text'
                    CHECK (message_type IN ('text', 'tutor_card', 'error', 'suggestion')),

  -- If message_type = 'tutor_card', this contains the tutor data
  metadata        JSONB DEFAULT NULL,

  -- Timing
  response_time_ms INTEGER,  -- How long the LLM took to respond (assistant messages only)

  -- Token usage
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,

  -- Created timestamp (immutable — do not update)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Service_role can access all messages
-- (Messages are managed by the Edge Function, not by client apps directly)
DROP POLICY IF EXISTS "Only service role can access messages" ON public.messages;
CREATE POLICY "Only service role can access messages"
  ON public.messages
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (conversation_id, created_at ASC);

-- No trigger for updated_at — messages are immutable and never updated.
