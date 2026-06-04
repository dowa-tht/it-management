-- DOWA IT System - RLS enablement and conservative authenticated policies
-- Generated from Supabase MCP inspection on 2026-05-13.
--
-- Critical context:
-- - These public tables had RLS disabled at inspection time:
--   checklist_docs, checklist_items, checklist_logs, checklist_templates, holidays,
--   system_settings, incident_exclusions, external_users, approval_tokens,
--   user_registry, user_limits, checklist_procedure_plans, checklist_documents,
--   checklist_results, no_series_lines, workflow_configs, document_approvals,
--   permission_sets.
-- - Policies below grant no anon access. All application-user policies target only
--   the authenticated Postgres role.
-- - Admin is resolved from public.user_profiles.role = 'admin'. Service-role clients
--   continue to bypass RLS by design.

begin;

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

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
  limit 1
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
    or public.current_user_role() = 'auditor' -- 🛡️ Auditor can read all checklists for auditing
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

create or replace function public.current_user_can_access_checklist_doc(p_doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_is_admin()
    or exists (
      select 1
      from public.checklist_docs d
      where d.id = p_doc_id
        and (
          d.created_by_id = auth.uid()
          or d.current_approver_id = auth.uid()
          or d.assigned_approver_id = auth.uid()
          or d.approved_by = auth.uid()
          or exists (
            select 1
            from public.document_approvals da
            where da.doc_id = d.id
              and da.doc_type = 'checklist'
              and (
                da.approver_id = auth.uid()
                or (da.approver_id is null and da.role_required = public.current_user_role())
              )
          )
        )
    ),
    false
  )
$$;

create or replace function public.current_user_can_access_incident(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_is_admin()
    or exists (
      select 1
      from public.incidents i
      where i.id = p_incident_id
        and (
          i.reported_by_id = auth.uid()
          or i.assigned_to_id = auth.uid()
          or i.assigned_approver_id = auth.uid()
          or exists (
            select 1
            from public.document_approvals da
            where da.doc_id = i.id
              and da.doc_type = 'incident'
              and (
                da.approver_id = auth.uid()
                or (da.approver_id is null and da.role_required = public.current_user_role())
              )
          )
        )
    ),
    false
  )
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on tables that were disabled
-- -----------------------------------------------------------------------------

alter table public.backup_logs enable row level security;
alter table public.checklist_docs enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_logs enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.holidays enable row level security;
alter table public.system_settings enable row level security;
alter table public.incident_exclusions enable row level security;
alter table public.external_users enable row level security;
alter table public.approval_tokens enable row level security;
alter table public.user_registry enable row level security;
alter table public.user_limits enable row level security;
alter table public.checklist_procedure_plans enable row level security;
alter table public.checklist_documents enable row level security;
alter table public.checklist_results enable row level security;
alter table public.no_series_lines enable row level security;
alter table public.workflow_configs enable row level security;
alter table public.document_approvals enable row level security;
alter table public.permission_sets enable row level security;

-- -----------------------------------------------------------------------------
-- Drop old generated policy names for idempotent re-run
-- -----------------------------------------------------------------------------

drop policy if exists "admin_all_checklist_docs" on public.checklist_docs;
drop policy if exists "authenticated_related_select_checklist_docs" on public.checklist_docs;
drop policy if exists "authenticated_owner_insert_checklist_docs" on public.checklist_docs;
drop policy if exists "authenticated_owner_update_checklist_docs" on public.checklist_docs;

drop policy if exists "admin_all_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_related_select_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_owner_insert_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_owner_update_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_owner_delete_checklist_items" on public.checklist_items;

drop policy if exists "admin_all_checklist_logs" on public.checklist_logs;
drop policy if exists "authenticated_related_select_checklist_logs" on public.checklist_logs;
drop policy if exists "authenticated_related_insert_checklist_logs" on public.checklist_logs;

drop policy if exists "admin_all_checklist_templates" on public.checklist_templates;
drop policy if exists "authenticated_read_checklist_templates" on public.checklist_templates;

drop policy if exists "admin_all_holidays" on public.holidays;
drop policy if exists "authenticated_read_holidays" on public.holidays;

drop policy if exists "admin_all_system_settings" on public.system_settings;
drop policy if exists "authenticated_read_required_system_settings" on public.system_settings;

drop policy if exists "admin_all_incident_exclusions" on public.incident_exclusions;
drop policy if exists "authenticated_related_select_incident_exclusions" on public.incident_exclusions;
drop policy if exists "authenticated_related_insert_incident_exclusions" on public.incident_exclusions;

drop policy if exists "admin_all_external_users" on public.external_users;
drop policy if exists "authenticated_created_by_select_external_users" on public.external_users;

drop policy if exists "admin_all_approval_tokens" on public.approval_tokens;
drop policy if exists "authenticated_created_by_select_approval_tokens" on public.approval_tokens;
drop policy if exists "authenticated_created_by_insert_approval_tokens" on public.approval_tokens;

drop policy if exists "admin_all_user_registry" on public.user_registry;
drop policy if exists "authenticated_self_select_user_registry" on public.user_registry;

drop policy if exists "admin_all_user_limits" on public.user_limits;
drop policy if exists "authenticated_read_user_limits" on public.user_limits;

drop policy if exists "admin_all_checklist_procedure_plans" on public.checklist_procedure_plans;
drop policy if exists "authenticated_read_checklist_procedure_plans" on public.checklist_procedure_plans;

drop policy if exists "admin_all_checklist_documents" on public.checklist_documents;
drop policy if exists "authenticated_owner_select_checklist_documents" on public.checklist_documents;
drop policy if exists "authenticated_owner_insert_checklist_documents" on public.checklist_documents;
drop policy if exists "authenticated_owner_update_checklist_documents" on public.checklist_documents;

drop policy if exists "admin_all_checklist_results" on public.checklist_results;
drop policy if exists "authenticated_related_select_checklist_results" on public.checklist_results;
drop policy if exists "authenticated_related_upsert_checklist_results" on public.checklist_results;

drop policy if exists "admin_all_no_series_lines" on public.no_series_lines;
drop policy if exists "authenticated_read_no_series_lines" on public.no_series_lines;

drop policy if exists "admin_all_workflow_configs" on public.workflow_configs;
drop policy if exists "authenticated_read_workflow_configs" on public.workflow_configs;

drop policy if exists "admin_all_document_approvals" on public.document_approvals;
drop policy if exists "authenticated_related_select_document_approvals" on public.document_approvals;
drop policy if exists "authenticated_assigned_update_document_approvals" on public.document_approvals;

drop policy if exists "admin_all_permission_sets" on public.permission_sets;
drop policy if exists "authenticated_read_permission_sets" on public.permission_sets;

-- -----------------------------------------------------------------------------
-- Checklist documents and child rows
-- -----------------------------------------------------------------------------

create policy "admin_all_checklist_docs"
on public.checklist_docs
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_related_select_checklist_docs"
on public.checklist_docs
for select
to authenticated
using (public.current_user_can_access_checklist_doc(id));

create policy "authenticated_owner_insert_checklist_docs"
on public.checklist_docs
for insert
to authenticated
with check (created_by_id = auth.uid());

create policy "authenticated_owner_update_checklist_docs"
on public.checklist_docs
for update
to authenticated
using (created_by_id = auth.uid() or current_approver_id = auth.uid() or assigned_approver_id = auth.uid())
with check (created_by_id = auth.uid() or current_approver_id = auth.uid() or assigned_approver_id = auth.uid());

create policy "admin_all_checklist_items"
on public.checklist_items
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_related_select_checklist_items"
on public.checklist_items
for select
to authenticated
using (public.current_user_can_access_checklist_doc(doc_id));

create policy "authenticated_owner_insert_checklist_items"
on public.checklist_items
for insert
to authenticated
with check (exists (
  select 1 from public.checklist_docs d
  where d.id = checklist_items.doc_id
    and d.created_by_id = auth.uid()
));

create policy "authenticated_owner_update_checklist_items"
on public.checklist_items
for update
to authenticated
using (exists (
  select 1 from public.checklist_docs d
  where d.id = checklist_items.doc_id
    and d.created_by_id = auth.uid()
))
with check (exists (
  select 1 from public.checklist_docs d
  where d.id = checklist_items.doc_id
    and d.created_by_id = auth.uid()
));

create policy "authenticated_owner_delete_checklist_items"
on public.checklist_items
for delete
to authenticated
using (exists (
  select 1 from public.checklist_docs d
  where d.id = checklist_items.doc_id
    and d.created_by_id = auth.uid()
));

create policy "admin_all_checklist_logs"
on public.checklist_logs
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_related_select_checklist_logs"
on public.checklist_logs
for select
to authenticated
using (public.current_user_can_access_checklist_doc(doc_id));

create policy "authenticated_related_insert_checklist_logs"
on public.checklist_logs
for insert
to authenticated
with check (public.current_user_can_access_checklist_doc(doc_id));

-- -----------------------------------------------------------------------------
-- Master data / settings / workflow configuration
-- -----------------------------------------------------------------------------

create policy "admin_all_checklist_templates"
on public.checklist_templates
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_checklist_templates"
on public.checklist_templates
for select
to authenticated
using (public.current_user_has_feature_access('checklist', 'RO'));

create policy "admin_all_holidays"
on public.holidays
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_holidays"
on public.holidays
for select
to authenticated
using (public.current_user_has_feature_access('dashboard', 'RO') or public.current_user_has_feature_access('reports', 'RO') or public.current_user_has_feature_access('checklist', 'RO'));

create policy "admin_all_system_settings"
on public.system_settings
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_required_system_settings"
on public.system_settings
for select
to authenticated
using (
  key in ('working_hours', 'sla_limits')
  or (key like '%_guide_content' and public.current_user_has_feature_access('settings', 'RO'))
);

create policy "admin_all_checklist_procedure_plans"
on public.checklist_procedure_plans
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_checklist_procedure_plans"
on public.checklist_procedure_plans
for select
to authenticated
using (public.current_user_has_feature_access('checklist', 'RO'));

create policy "admin_all_no_series_lines"
on public.no_series_lines
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_no_series_lines"
on public.no_series_lines
for select
to authenticated
using (public.current_user_has_feature_access('settings', 'RO'));

create policy "admin_all_workflow_configs"
on public.workflow_configs
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_workflow_configs"
on public.workflow_configs
for select
to authenticated
using (public.current_user_has_feature_access('settings', 'RO') or public.current_user_has_feature_access('checklist', 'RO') or public.current_user_has_feature_access('incidents', 'RO'));

create policy "admin_all_permission_sets"
on public.permission_sets
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_permission_sets"
on public.permission_sets
for select
to authenticated
using (role_name in (
  public.current_user_role(),
  case public.current_user_role()
    when 'admin' then 'administrator'
    when 'approver' then 'approval'
    when 'employee' then 'member'
    when 'auditor' then 'guest'
    else public.current_user_role()
  end
));

create policy "admin_all_user_limits"
on public.user_limits
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_user_limits"
on public.user_limits
for select
to authenticated
using (public.current_user_has_feature_access('settings', 'RO'));

-- -----------------------------------------------------------------------------
-- Incident exclusions
-- -----------------------------------------------------------------------------

create policy "admin_all_incident_exclusions"
on public.incident_exclusions
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_related_select_incident_exclusions"
on public.incident_exclusions
for select
to authenticated
using (public.current_user_can_access_incident(incident_id));

create policy "authenticated_related_insert_incident_exclusions"
on public.incident_exclusions
for insert
to authenticated
with check (public.current_user_can_access_incident(incident_id));

-- -----------------------------------------------------------------------------
-- External users, approval tokens and user registry
-- -----------------------------------------------------------------------------

create policy "admin_all_external_users"
on public.external_users
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_created_by_select_external_users"
on public.external_users
for select
to authenticated
using (created_by = auth.uid());

create policy "admin_all_approval_tokens"
on public.approval_tokens
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_created_by_select_approval_tokens"
on public.approval_tokens
for select
to authenticated
using (created_by = auth.uid());

create policy "authenticated_created_by_insert_approval_tokens"
on public.approval_tokens
for insert
to authenticated
with check (created_by = auth.uid());

create policy "admin_all_user_registry"
on public.user_registry
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_self_select_user_registry"
on public.user_registry
for select
to authenticated
using (supabase_user_id = auth.uid() or created_by = auth.uid() or last_role_changed_by = auth.uid());

-- -----------------------------------------------------------------------------
-- Legacy checklist tables
-- -----------------------------------------------------------------------------

create policy "admin_all_checklist_documents"
on public.checklist_documents
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_owner_select_checklist_documents"
on public.checklist_documents
for select
to authenticated
using (created_by = auth.uid());

create policy "authenticated_owner_insert_checklist_documents"
on public.checklist_documents
for insert
to authenticated
with check (created_by = auth.uid());

create policy "authenticated_owner_update_checklist_documents"
on public.checklist_documents
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "admin_all_checklist_results"
on public.checklist_results
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_related_select_checklist_results"
on public.checklist_results
for select
to authenticated
using (exists (
  select 1 from public.checklist_documents d
  where d.id = checklist_results.document_id
    and d.created_by = auth.uid()
));

create policy "authenticated_related_upsert_checklist_results"
on public.checklist_results
for all
to authenticated
using (exists (
  select 1 from public.checklist_documents d
  where d.id = checklist_results.document_id
    and d.created_by = auth.uid()
))
with check (exists (
  select 1 from public.checklist_documents d
  where d.id = checklist_results.document_id
    and d.created_by = auth.uid()
));

-- -----------------------------------------------------------------------------
-- Unified workflow approvals
-- -----------------------------------------------------------------------------

create policy "admin_all_document_approvals"
on public.document_approvals
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_related_select_document_approvals"
on public.document_approvals
for select
to authenticated
using (
  approver_id = auth.uid()
  or (approver_id is null and role_required = public.current_user_role())
  or (doc_type = 'checklist' and public.current_user_can_access_checklist_doc(doc_id))
  or (doc_type = 'incident' and public.current_user_can_access_incident(doc_id))
);

create policy "authenticated_assigned_update_document_approvals"
on public.document_approvals
for update
to authenticated
using (approver_id = auth.uid() or (approver_id is null and role_required = public.current_user_role()))
with check (approver_id = auth.uid() or (approver_id is null and role_required = public.current_user_role()));

-- -----------------------------------------------------------------------------
-- Backup logs security
-- -----------------------------------------------------------------------------

drop policy if exists "admin_all_backup_logs" on public.backup_logs;
drop policy if exists "authenticated_select_backup_logs" on public.backup_logs;

create policy "admin_all_backup_logs"
on public.backup_logs
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_select_backup_logs"
on public.backup_logs
for select
to authenticated
using (true);

commit;
