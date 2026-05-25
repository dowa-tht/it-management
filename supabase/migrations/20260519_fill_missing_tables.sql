-- Fill missing tables for production bootstrap on fresh project
-- Safe mode: CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Settings / Master
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_data_type ON public.master_data(type);

CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_holiday_date ON public.holidays(holiday_date);

CREATE TABLE IF NOT EXISTS public.working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_day INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  action TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON public.login_logs(created_at);

CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);

CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE,
  system_name TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_logs_log_date ON public.backup_logs(log_date);

-- ============================================================
-- Checklist core
-- ============================================================
ALTER TABLE public.checklist_docs
  ADD COLUMN IF NOT EXISTS doc_no TEXT,
  ADD COLUMN IF NOT EXISTS freq_type TEXT,
  ADD COLUMN IF NOT EXISTS period_date DATE,
  ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_approver_id UUID;

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT,
  category TEXT,
  freq_type TEXT,
  item_label TEXT,
  instruction TEXT,
  ui_template_type TEXT,
  template_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID,
  item_key TEXT,
  item_label TEXT,
  category TEXT,
  status TEXT DEFAULT 'Open',
  notes TEXT,
  checked_at TIMESTAMPTZ,
  template_data JSONB DEFAULT '{}'::jsonb,
  target_snapshot JSONB DEFAULT '{}'::jsonb,
  evidence_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_doc_id ON public.checklist_items(doc_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_item_key ON public.checklist_items(item_key);

CREATE TABLE IF NOT EXISTS public.checklist_procedure_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Target registry
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checklist_target_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT,
  group_name TEXT,
  target_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_code TEXT,
  target_type TEXT,
  target_group_id UUID,
  name TEXT,
  location TEXT,
  qr_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_targets_target_code ON public.checklist_targets(target_code);
CREATE INDEX IF NOT EXISTS idx_checklist_targets_target_group_id ON public.checklist_targets(target_group_id);

CREATE TABLE IF NOT EXISTS public.checklist_template_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  target_id UUID,
  target_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_template_targets_template_id ON public.checklist_template_targets(template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_template_targets_target_id ON public.checklist_template_targets(target_id);

-- ============================================================
-- Incident support
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID,
  reason_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_exclusions_incident_id ON public.incident_exclusions(incident_id);

CREATE TABLE IF NOT EXISTS public.sla_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID,
  reason TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_exclusions_incident_id ON public.sla_exclusions(incident_id);

CREATE TABLE IF NOT EXISTS public.sla_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Workflow / permission / approval config
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT,
  target_type TEXT,
  condition_value TEXT,
  step_order INTEGER,
  role_required TEXT,
  approver_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_configs_doc_type ON public.workflow_configs(doc_type);

CREATE TABLE IF NOT EXISTS public.approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT,
  primary_approver_id UUID,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_substitutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_approver_id UUID,
  substitute_approver_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_substitutes_primary ON public.approval_substitutes(primary_approver_id);

CREATE TABLE IF NOT EXISTS public.permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  access_level TEXT DEFAULT 'NONE',
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT permission_sets_role_feature_unique UNIQUE (role_name, feature_key)
);

ALTER TABLE public.permission_sets
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'NONE';

-- ============================================================
-- Number series
-- ============================================================
CREATE TABLE IF NOT EXISTS public.no_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.no_series_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_code TEXT NOT NULL,
  starting_date DATE NOT NULL,
  ending_date DATE,
  format TEXT,
  last_no_used INTEGER DEFAULT 0,
  increment_by INTEGER DEFAULT 1,
  warning_no INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_series_lines_unique UNIQUE (series_code, starting_date)
);

CREATE INDEX IF NOT EXISTS idx_no_series_lines_series_code ON public.no_series_lines(series_code);

-- ============================================================
-- Whitelist / auth support
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibility: current app code reads user_profiles.email directly
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- ============================================================
-- Bootstrap seed: minimum menu + admin permissions
-- ============================================================
INSERT INTO public.master_data (type, value, sort_order, is_active)
VALUES
  ('incident_category', 'General', 1, TRUE),
  ('incident_severity', 'Low', 1, TRUE),
  ('incident_severity', 'Medium', 2, TRUE),
  ('incident_severity', 'High', 3, TRUE),
  ('checklist_category', 'General', 1, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.permission_sets (role_name, feature_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('admin', 'dashboard', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'incidents', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'checklist', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'approvals', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'reports', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings_users', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings_logs', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings_workflow', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings_master_data', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings_working_hours', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings_holidays', TRUE, TRUE, TRUE, TRUE),
  ('admin', 'settings_no_series', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (role_name, feature_key)
DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  updated_at = NOW();

-- App uses access_level in lib/auth.checkPermission()
INSERT INTO public.permission_sets (role_name, feature_key, access_level)
VALUES
  ('admin', 'dashboard', 'RW'),
  ('admin', 'incidents', 'RW'),
  ('admin', 'reports', 'RW'),
  ('admin', 'backup', 'RW'),
  ('admin', 'checklist', 'RW'),
  ('admin', 'approvals', 'RW'),
  ('admin', 'my-pending', 'RW'),
  ('admin', 'settings', 'RW')
ON CONFLICT (role_name, feature_key)
DO UPDATE SET
  access_level = EXCLUDED.access_level,
  updated_at = NOW();

