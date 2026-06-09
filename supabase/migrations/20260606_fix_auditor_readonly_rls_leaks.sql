-- Migration: Fix auditor read-only RLS leaks for checklist and incident modules
-- Date: 2026-06-06
-- Goal:
--   1. Remove legacy permissive policies that let any authenticated user mutate incidents
--   2. Split checklist read access from checklist write access so auditors remain read-only
--   3. Align live RLS behavior with UI expectations for admin / it_staff / reporter editing

begin;

-- ============================================================
-- 1. Checklist: keep access helper for write paths only
--    Auditors must use current_user_can_read_checklist_doc() for SELECT only.
-- ============================================================
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
          or d.approved_by = auth.uid()::text
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

drop policy if exists "Enable insert for authenticated users" on public.checklist_docs;
drop policy if exists "Enable update access for permitted users" on public.checklist_docs;
drop policy if exists "authenticated_owner_insert_checklist_docs" on public.checklist_docs;
drop policy if exists "authenticated_owner_update_checklist_docs" on public.checklist_docs;

create policy "authenticated_owner_insert_checklist_docs"
on public.checklist_docs
for insert
to authenticated
with check (
  created_by_id = auth.uid()
  and public.current_user_role() <> 'auditor'
);

create policy "authenticated_owner_update_checklist_docs"
on public.checklist_docs
for update
to authenticated
using (
  public.current_user_role() <> 'auditor'
  and (
    created_by_id = auth.uid()
    or current_approver_id = auth.uid()
    or assigned_approver_id = auth.uid()
    or public.current_user_role() in ('admin', 'it_staff')
  )
)
with check (
  public.current_user_role() <> 'auditor'
  and (
    created_by_id = auth.uid()
    or current_approver_id = auth.uid()
    or assigned_approver_id = auth.uid()
    or public.current_user_role() in ('admin', 'it_staff')
  )
);

drop policy if exists "Enable insert for checklist items via doc access" on public.checklist_items;
drop policy if exists "Enable update access for checklist items via doc access" on public.checklist_items;
drop policy if exists "Enable delete access for checklist items via doc access" on public.checklist_items;

drop policy if exists "authenticated_owner_insert_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_owner_update_checklist_items" on public.checklist_items;
drop policy if exists "authenticated_owner_delete_checklist_items" on public.checklist_items;

create policy "authenticated_owner_insert_checklist_items"
on public.checklist_items
for insert
to authenticated
with check (public.current_user_can_access_checklist_doc(doc_id));

create policy "authenticated_owner_update_checklist_items"
on public.checklist_items
for update
to authenticated
using (public.current_user_can_access_checklist_doc(doc_id))
with check (public.current_user_can_access_checklist_doc(doc_id));

create policy "authenticated_owner_delete_checklist_items"
on public.checklist_items
for delete
to authenticated
using (public.current_user_can_access_checklist_doc(doc_id));

drop policy if exists "insert_checklist_item_steps" on public.checklist_item_steps;
drop policy if exists "update_checklist_item_steps" on public.checklist_item_steps;

create policy "insert_checklist_item_steps"
on public.checklist_item_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from public.checklist_items ci
    where ci.id = item_id
      and public.current_user_can_access_checklist_doc(ci.doc_id)
  )
);

create policy "update_checklist_item_steps"
on public.checklist_item_steps
for update
to authenticated
using (
  exists (
    select 1
    from public.checklist_items ci
    where ci.id = item_id
      and public.current_user_can_access_checklist_doc(ci.doc_id)
  )
)
with check (
  exists (
    select 1
    from public.checklist_items ci
    where ci.id = item_id
      and public.current_user_can_access_checklist_doc(ci.doc_id)
  )
);

-- ============================================================
-- 2. Incidents: replace broad authenticated write access
-- ============================================================
alter table public.incidents enable row level security;

create or replace function public.current_user_can_read_incident(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_role() in ('admin', 'it_staff', 'auditor')
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

create or replace function public.current_user_can_edit_incident(p_incident_id uuid)
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
      from public.incidents i
      where i.id = p_incident_id
        and i.reported_by_id = auth.uid()
    ),
    false
  )
$$;

drop policy if exists "Allow all for authenticated users" on public.incidents;
drop policy if exists "authenticated_related_select_incidents" on public.incidents;
drop policy if exists "authenticated_related_update_incidents" on public.incidents;

create policy "authenticated_related_select_incidents"
on public.incidents
for select
to authenticated
using (public.current_user_can_read_incident(id));

create policy "authenticated_related_update_incidents"
on public.incidents
for update
to authenticated
using (public.current_user_can_edit_incident(id))
with check (public.current_user_can_edit_incident(id));

commit;
