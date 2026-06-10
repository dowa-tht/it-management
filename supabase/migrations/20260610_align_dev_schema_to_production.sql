-- Align Dev Schema to Production custom changes (10 Jun 2026)
BEGIN;

ALTER TABLE public.checklist_docs ADD COLUMN IF NOT EXISTS template_id uuid;

ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS onboarding_token_expires timestamp with time zone,
  ADD COLUMN IF NOT EXISTS recovery_otp text,
  ADD COLUMN IF NOT EXISTS recovery_otp_expires timestamp with time zone;

COMMIT;
