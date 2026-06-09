begin;

alter table public.working_hours enable row level security;
alter table public.sla_exclusions enable row level security;
alter table public.sla_holidays enable row level security;
alter table public.approval_substitutes enable row level security;

drop policy if exists "admin_all_working_hours" on public.working_hours;
drop policy if exists "admin_all_sla_exclusions" on public.sla_exclusions;
drop policy if exists "admin_all_sla_holidays" on public.sla_holidays;

drop policy if exists "admin_all_approval_substitutes" on public.approval_substitutes;
drop policy if exists "authenticated_select_own_or_substitute_approval_substitutes" on public.approval_substitutes;
drop policy if exists "authenticated_insert_own_approval_substitutes" on public.approval_substitutes;
drop policy if exists "authenticated_update_own_approval_substitutes" on public.approval_substitutes;
drop policy if exists "authenticated_delete_own_approval_substitutes" on public.approval_substitutes;

create policy "admin_all_working_hours"
on public.working_hours
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "admin_all_sla_exclusions"
on public.sla_exclusions
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "admin_all_sla_holidays"
on public.sla_holidays
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "admin_all_approval_substitutes"
on public.approval_substitutes
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "authenticated_select_own_or_substitute_approval_substitutes"
on public.approval_substitutes
for select
to authenticated
using (
  primary_approver_id = auth.uid()
  or substitute_id = auth.uid()
);

create policy "authenticated_insert_own_approval_substitutes"
on public.approval_substitutes
for insert
to authenticated
with check (
  primary_approver_id = auth.uid()
);

create policy "authenticated_update_own_approval_substitutes"
on public.approval_substitutes
for update
to authenticated
using (
  primary_approver_id = auth.uid()
)
with check (
  primary_approver_id = auth.uid()
);

create policy "authenticated_delete_own_approval_substitutes"
on public.approval_substitutes
for delete
to authenticated
using (
  primary_approver_id = auth.uid()
);

commit;
