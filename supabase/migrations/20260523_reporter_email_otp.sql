-- ============================================================
-- Migration: Reporter Email + Email OTP Table
-- Date: 2026-05-23
-- Purpose:
--   1. Add reporter_email (NOT NULL) to incidents table
--   2. Backfill existing incidents
--   3. Create email_otps table for Quick Add OTP verification
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PART 1: incidents.reporter_email
-- ─────────────────────────────────────────────────────────────

-- Step 1: Add column (nullable first to allow backfill)
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS reporter_email TEXT;

-- Step 2: Backfill from user_profiles for incidents with known reporter
UPDATE public.incidents i
SET reporter_email = u.email
FROM public.user_profiles u
WHERE i.reported_by_id = u.id
  AND i.reporter_email IS NULL;

-- Step 3: Fallback for legacy incidents without reported_by_id
--         (9 records: ทิวลี่, ออยลี่, ตั้ม, Chuta, User A, 55555, 123, User, Gmail Natthawut)
UPDATE public.incidents
SET reporter_email = 'no-reply@dowa-it.local'
WHERE reporter_email IS NULL;

-- Step 4: Enforce NOT NULL after backfill
ALTER TABLE public.incidents
  ALTER COLUMN reporter_email SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- PART 2: email_otps table (Quick Add OTP — not linked to user_profiles)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_otps (
  email       TEXT PRIMARY KEY,
  otp_code    TEXT NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for expired-OTP cleanup queries
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at
  ON public.email_otps (expires_at);

-- Enable Row Level Security
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service_role (server-side actions) full access
-- Application uses SUPABASE_SERVICE_ROLE_KEY → bypasses RLS automatically.
-- No additional anon/authenticated policies needed (OTP is server-only).
-- This policy is a safety net to prevent accidental public access.
CREATE POLICY "Deny all direct client access to email_otps"
  ON public.email_otps
  FOR ALL
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- PART 3: Auto-cleanup function for expired OTPs
-- ─────────────────────────────────────────────────────────────

-- Function to purge expired OTP records (call from cron or on-demand)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.email_otps
  WHERE expires_at < NOW();
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- PART 4: Upgrade workflow RPC audit metadata
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_approval_step(
    p_doc_id UUID,
    p_doc_type TEXT,
    p_step_id UUID,
    p_approver_id UUID,
    p_user_email TEXT,
    p_sig_data TEXT,
    p_comment TEXT,
    p_is_remote BOOLEAN,
    p_log_details TEXT,
    p_approval_method TEXT DEFAULT 'direct_standard',
    p_verified_by_pin BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_step_order INT;
    v_next_step_id UUID;
    v_target_table TEXT;
    v_result JSONB;
BEGIN
    SELECT step_order INTO v_step_order
    FROM public.document_approvals
    WHERE id = p_step_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Step not ready for approval or already processed');
    END IF;

    UPDATE public.document_approvals
    SET 
        status = 'approved',
        approver_id = p_approver_id,
        signature_data = p_sig_data,
        comment = p_comment,
        action_at = NOW(),
        verified_by_pin = p_verified_by_pin
    WHERE id = p_step_id;

    SELECT id INTO v_next_step_id
    FROM public.document_approvals
    WHERE doc_id = p_doc_id AND step_order = v_step_order + 1
    ORDER BY step_order ASC
    LIMIT 1;

    IF v_next_step_id IS NOT NULL THEN
        UPDATE public.document_approvals
        SET status = 'pending'
        WHERE id = v_next_step_id;
        
        v_result := jsonb_build_object('success', true, 'is_final', false);
    ELSE
        v_target_table := CASE WHEN lower(p_doc_type) = 'checklist' THEN 'checklist_docs' ELSE 'incidents' END;
        EXECUTE format('UPDATE public.%I SET status = ''Closed'', workflow_status = ''approved'' WHERE id = %L', v_target_table, p_doc_id);
        v_result := jsonb_build_object('success', true, 'is_final', true);
    END IF;

    INSERT INTO public.system_audit_logs (doc_id, doc_type, action, details, user_email, metadata)
    VALUES (
        p_doc_id, 
        lower(p_doc_type), 
        'Approved', 
        p_log_details, 
        p_user_email,
        jsonb_build_object(
          'step_order', v_step_order,
          'is_remote', p_is_remote,
          'rpc', true,
          'approval_method', coalesce(p_approval_method, 'direct_standard'),
          'verified_by_pin', p_verified_by_pin
        )
    );

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
