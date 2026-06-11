BEGIN;

ALTER TABLE public.approval_tokens
  ADD COLUMN IF NOT EXISTS step_id uuid,
  ADD COLUMN IF NOT EXISTS step_order integer,
  ADD COLUMN IF NOT EXISTS approver_id uuid,
  ADD COLUMN IF NOT EXISTS doc_no text,
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS consumed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS session_hash text,
  ADD COLUMN IF NOT EXISTS session_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS approval_tokens_token_hash_key
  ON public.approval_tokens (token_hash)
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_tokens_document_step
  ON public.approval_tokens (document_type, document_id, step_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_active_lookup
  ON public.approval_tokens (document_type, document_id, step_id, revoked_at, used_at, expires_at);

COMMIT;
