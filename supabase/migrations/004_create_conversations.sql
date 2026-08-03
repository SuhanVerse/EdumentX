-- 004_create_conversations.sql
-- Conversations table: stores AI chat session state.
-- Each session tracks the conversation flow, accumulated constraints,
-- last search results, and fallback state.
--
-- NOTE: This table stores AI-specific session data only.
-- User identity is still managed by Firebase Auth. The student_id
-- field stores the Firebase Auth UID for reference, but there is
-- no foreign key constraint to a users table (users live in Firebase).

CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Client-generated session ID (used in API requests)
  session_id      TEXT NOT NULL UNIQUE,
  
  -- Firebase Auth UID of the student
  student_id      TEXT NOT NULL,

  -- State machine: current step in the conversation flow
  current_step    TEXT NOT NULL DEFAULT 'collecting'
                    CHECK (current_step IN ('collecting', 'searching', 'presenting', 'followup')),

  -- Accumulated constraints (JSONB for flexibility)
  -- Structure: { subject, budget_max, budget_min, gender_preference, ... }
  constraints     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Last search results: array of { tutor_id, full_name, score, similarity }
  -- Used for follow-up refinement without re-querying
  last_results    JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Fallback state
  fallback_attempted  BOOLEAN NOT NULL DEFAULT false,
  fallback_level      INTEGER NOT NULL DEFAULT 0,

  -- Conversation metadata
  total_messages  INTEGER NOT NULL DEFAULT 0,
  search_count    INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Session expires after 30 minutes of inactivity
  is_expired      BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row-Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Students can only see their own conversations
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
CREATE POLICY "Users can manage their own conversations"
  ON public.conversations
  FOR ALL
  USING (student_id = auth.uid()::text)
  WITH CHECK (student_id = auth.uid()::text);

-- Policy: Service_role can access all conversations
DROP POLICY IF EXISTS "Service role can access all conversations" ON public.conversations;
CREATE POLICY "Service role can access all conversations"
  ON public.conversations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON public.conversations (session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON public.conversations (student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON public.conversations (last_activity DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
