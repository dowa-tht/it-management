-- Production Schema Alignment Patch (10 Jun 2026)
-- Safe mode: CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- Excludes production custom columns (template_id, onboarding_token_expires, recovery_otp, recovery_otp_expires)
BEGIN;

-- 1. Create missing tables
-- public.email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  sender text,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  resend_id text,
  error_message text,
  metadata jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS email_logs_pkey ON public.email_logs (id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs (recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);

-- public.approval_tokens
CREATE TABLE IF NOT EXISTS public.approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  document_type text NOT NULL,
  document_title text,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  approver_email text NOT NULL,
  approver_name text,
  external_user_id uuid,
  action text,
  comment text,
  approved_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS approval_tokens_pkey ON public.approval_tokens (id);
CREATE UNIQUE INDEX IF NOT EXISTS approval_tokens_token_key ON public.approval_tokens (token);

-- 2. Enable RLS on new tables
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS policies for approval_tokens (Drop first if exists to prevent duplicates)
DROP POLICY IF EXISTS "admin_all_approval_tokens" ON public.approval_tokens;
CREATE POLICY "admin_all_approval_tokens" ON public.approval_tokens
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated_created_by_insert_approval_tokens" ON public.approval_tokens;
CREATE POLICY "authenticated_created_by_insert_approval_tokens" ON public.approval_tokens
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "authenticated_created_by_select_approval_tokens" ON public.approval_tokens;
CREATE POLICY "authenticated_created_by_select_approval_tokens" ON public.approval_tokens
  FOR SELECT TO authenticated USING (created_by = auth.uid());

-- 4. Align checklist_templates.ui_template_type from TEXT to INTEGER (with safe casting)
ALTER TABLE public.checklist_templates 
  ALTER COLUMN ui_template_type TYPE integer USING (
    CASE 
      WHEN ui_template_type ~ '^[0-9]+$' THEN ui_template_type::integer 
      ELSE NULL 
    END
  );

-- 5. Align checklist_docs columns
ALTER TABLE public.checklist_docs
  ALTER COLUMN approved_by TYPE uuid USING (
    CASE 
      WHEN approved_by ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN approved_by::uuid 
      ELSE NULL 
    END
  ),
  ADD COLUMN IF NOT EXISTS is_substituted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_comment text,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS history_scope text;

-- 6. Align checklist_items columns
ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS target_id uuid;

-- 7. Align user_profiles columns
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS employee_id text;

-- 8. Align incidents columns
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS affected_system text,
  ADD COLUMN IF NOT EXISTS reported_by text,
  ALTER COLUMN assigned_to TYPE text USING (assigned_to::text),
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS signature_it text,
  ADD COLUMN IF NOT EXISTS signature_manager text,
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_by text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ref_type text,
  ADD COLUMN IF NOT EXISTS ref_id uuid,
  ADD COLUMN IF NOT EXISTS ref_doc_no text,
  ADD COLUMN IF NOT EXISTS signature_reporter text,
  ADD COLUMN IF NOT EXISTS sla_compliance_score double precision,
  ADD COLUMN IF NOT EXISTS corrective_action text,
  ADD COLUMN IF NOT EXISTS require_ca boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS created_by_id uuid,
  ADD COLUMN IF NOT EXISTS created_by text;

-- 9. Align incident_exclusions columns
ALTER TABLE public.incident_exclusions
  ALTER COLUMN created_by TYPE text USING (created_by::text);

-- 10. Align checklist_procedure_plans columns
ALTER TABLE public.checklist_procedure_plans
  ADD COLUMN IF NOT EXISTS description text;

-- 11. Align approval_configs columns
ALTER TABLE public.approval_configs
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS trigger_key text,
  ADD COLUMN IF NOT EXISTS allowed_roles text[],
  ADD COLUMN IF NOT EXISTS freq_type text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority integer;

-- 12. Align system_logs columns
ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS action text,
  ALTER COLUMN details TYPE text USING (details::text),
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 13. Align no_series_lines columns
ALTER TABLE public.no_series_lines
  ALTER COLUMN last_date_used TYPE timestamp with time zone USING (last_date_used::timestamp with time zone);

-- 14. Align backup_logs columns
ALTER TABLE public.backup_logs
  ADD COLUMN IF NOT EXISTS backup_type text;

COMMIT;
