-- Migration: Enable Checklist Collaboration for IT Staff and Admin
-- Filename: supabase/migrations/20260517_checklist_collaboration.sql

begin;

-- 1. Update public.current_user_can_access_checklist_doc to allow 'admin' and 'it_staff' immediate access
create or replace function public.current_user_can_access_checklist_doc(p_doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_role() in ('admin', 'it_staff')
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

-- 2. Drop and recreate update policy for checklist_docs to allow IT Staff and Admin to collaborate
drop policy if exists "authenticated_owner_update_checklist_docs" on public.checklist_docs;

create policy "authenticated_owner_update_checklist_docs"
on public.checklist_docs
for update
to authenticated
using (
  created_by_id = auth.uid()
  or current_approver_id = auth.uid()
  or assigned_approver_id = auth.uid()
  or public.current_user_role() in ('admin', 'it_staff')
)
with check (
  created_by_id = auth.uid()
  or current_approver_id = auth.uid()
  or assigned_approver_id = auth.uid()
  or public.current_user_role() in ('admin', 'it_staff')
);

-- 3. Drop and recreate checklist_items policies to inherit from current_user_can_access_checklist_doc
drop policy if exists "authenticated_owner_insert_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_owner_update_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_owner_delete_checklist_items" on public.checklist_items;

create policy "authenticated_owner_insert_checklist_items"
on public.checklist_items
for insert
to authenticated
with check (
  public.current_user_can_access_checklist_doc(doc_id)
);

create policy "authenticated_owner_update_checklist_items"
on public.checklist_items
for update
to authenticated
using (
  public.current_user_can_access_checklist_doc(doc_id)
)
with check (
  public.current_user_can_access_checklist_doc(doc_id)
);

create policy "authenticated_owner_delete_checklist_items"
on public.checklist_items
for delete
to authenticated
using (
  public.current_user_can_access_checklist_doc(doc_id)
);

-- 4. Enable RLS and setup policies for target registry tables
alter table public.checklist_targets enable row level security;
alter table public.checklist_target_groups enable row level security;
alter table public.checklist_template_targets enable row level security;

-- Drop old policies if exist for idempotency
drop policy if exists "admin_all_checklist_targets" on public.checklist_targets;
drop policy if exists "authenticated_read_checklist_targets" on public.checklist_targets;
drop policy if exists "admin_all_checklist_target_groups" on public.checklist_target_groups;
drop policy if exists "authenticated_read_checklist_target_groups" on public.checklist_target_groups;
drop policy if exists "admin_all_checklist_template_targets" on public.checklist_template_targets;
drop policy if exists "authenticated_read_checklist_template_targets" on public.checklist_template_targets;

-- Create policies for checklist_targets
create policy "admin_all_checklist_targets"
on public.checklist_targets for all to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_checklist_targets"
on public.checklist_targets for select to authenticated
using (public.current_user_has_feature_access('checklist', 'RO'));

-- Create policies for checklist_target_groups
create policy "admin_all_checklist_target_groups"
on public.checklist_target_groups for all to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_checklist_target_groups"
on public.checklist_target_groups for select to authenticated
using (public.current_user_has_feature_access('checklist', 'RO'));

-- Create policies for checklist_template_targets
create policy "admin_all_checklist_template_targets"
on public.checklist_template_targets for all to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_read_checklist_template_targets"
on public.checklist_template_targets for select to authenticated
using (public.current_user_has_feature_access('checklist', 'RO'));

commit;
