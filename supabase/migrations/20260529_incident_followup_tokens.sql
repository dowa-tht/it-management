-- ============================================================
-- Migration: Incident External Follow-up Tokens (7-day TTL)
-- Date: 2026-05-29
-- Purpose:
--   1. Store secure follow-up tokens for external incident reporters
--   2. Support token revoke/rotation and view telemetry
--   3. Enforce server-side only access pattern
-- ============================================================

CREATE TABLE IF NOT EXISTS public.incident_followup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  reporter_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NULL,
  revoked_reason TEXT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_by_id UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by_email TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_incident_followup_tokens_incident_id
  ON public.incident_followup_tokens (incident_id);

CREATE INDEX IF NOT EXISTS idx_incident_followup_tokens_reporter_email
  ON public.incident_followup_tokens (reporter_email);

CREATE INDEX IF NOT EXISTS idx_incident_followup_tokens_expires_at
  ON public.incident_followup_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_incident_followup_tokens_active_lookup
  ON public.incident_followup_tokens (token_hash, expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.incident_followup_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all direct client access to incident_followup_tokens"
  ON public.incident_followup_tokens
  FOR ALL
  USING (false);

CREATE OR REPLACE FUNCTION public.cleanup_expired_incident_followup_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.incident_followup_tokens
  WHERE expires_at < NOW();
END;
$$;
