-- Base Schema Bootstrap for fresh Supabase project
-- Purpose: create minimum required tables before running incremental migrations
-- Scope: structure/config only (no business data seed)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Core identity/profile tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (
    role IN ('admin', 'administrator', 'supervisor', 'approval', 'guest', 'member', 'user', 'visitor')
  ),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  can_be_assignee BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.external_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('approval', 'guest', 'member')),
  access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_duration_days INTEGER DEFAULT 7,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  pin_hash TEXT,
  pin_reset_token TEXT,
  pin_reset_expires TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.user_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'administrator', 'supervisor', 'approval', 'guest', 'member')),
  supabase_user_id UUID,
  external_user_id UUID REFERENCES public.external_users(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_role_changed_at TIMESTAMPTZ,
  last_role_changed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Core workflow/document tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT,
  title TEXT,
  status TEXT DEFAULT 'Open',
  workflow_status TEXT,
  assigned_to UUID,
  assigned_to_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'Open',
  workflow_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  approver_id UUID,
  signature_data TEXT,
  comment TEXT,
  action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Supporting logs/tables referenced by later migrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID,
  action TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID,
  action TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_limits (
  id SERIAL PRIMARY KEY,
  max_total INTEGER DEFAULT 50,
  max_per_day INTEGER DEFAULT 5,
  max_per_month INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful baseline indexes
CREATE INDEX IF NOT EXISTS idx_document_approvals_doc_id ON public.document_approvals(doc_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_doc_type ON public.document_approvals(doc_type);
CREATE INDEX IF NOT EXISTS idx_incident_logs_incident_id ON public.incident_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_checklist_logs_doc_id ON public.checklist_logs(doc_id);



-- Helper function for RLS and collaboration checks
create or replace function public.current_user_role()
  returns text
  language sql
  stable
  security definer
  set search_path = public, auth
  as $$
    select up.role
    from public.user_profiles up
    where up.id = auth.uid()
      and coalesce(up.is_active, true) = true
    limit 1;
$$;



create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.current_user_has_feature_access(
  p_feature_key text,
  p_min_access text default 'RO'
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_is_admin()
    or public.current_user_role() = 'auditor'
    or exists (
      select 1
      from public.permission_sets ps
      where ps.role_name in (
        public.current_user_role(),
        case public.current_user_role()
          when 'admin' then 'administrator'
          when 'approver' then 'approval'
          when 'employee' then 'member'
          when 'auditor' then 'guest'
          else public.current_user_role()
        end
      )
        and ps.feature_key = p_feature_key
        and (
          ps.access_level = 'RW'
          or (p_min_access = 'RO' and ps.access_level = 'RO')
        )
    ),
    false
  )
$$;

