-- Migration: Checklist auditor read-only RLS alignment
-- Date: 2026-06-05
-- Goal:
--   Allow internal auditor accounts to read checklist documents for audit purposes
--   without broadening write access for checklist docs/items/workflow rows.

begin;

create or replace function public.current_user_can_read_checklist_doc(p_doc_id uuid)
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

drop policy if exists "Enable read access for permitted users" on public.checklist_docs;
drop policy if exists "authenticated_related_select_checklist_docs" on public.checklist_docs;

create policy "authenticated_related_select_checklist_docs"
on public.checklist_docs
for select
to authenticated
using (public.current_user_can_read_checklist_doc(id));

drop policy if exists "Enable read access for checklist items via doc access" on public.checklist_items;
drop policy if exists "authenticated_related_select_checklist_items" on public.checklist_items;

create policy "authenticated_related_select_checklist_items"
on public.checklist_items
for select
to authenticated
using (public.current_user_can_read_checklist_doc(doc_id));

drop policy if exists "authenticated_related_select_checklist_logs" on public.checklist_logs;

create policy "authenticated_related_select_checklist_logs"
on public.checklist_logs
for select
to authenticated
using (public.current_user_can_read_checklist_doc(doc_id));

drop policy if exists "authenticated_related_select_document_approvals" on public.document_approvals;

create policy "authenticated_related_select_document_approvals"
on public.document_approvals
for select
to authenticated
using (
  approver_id = auth.uid()
  or (approver_id is null and role_required = public.current_user_role())
  or (doc_type = 'checklist' and public.current_user_can_read_checklist_doc(doc_id))
  or (doc_type = 'incident' and public.current_user_can_access_incident(doc_id))
);

drop policy if exists "select_checklist_item_steps" on public.checklist_item_steps;

create policy "select_checklist_item_steps"
on public.checklist_item_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.checklist_items ci
    where ci.id = item_id
      and public.current_user_can_read_checklist_doc(ci.doc_id)
  )
);

commit;
