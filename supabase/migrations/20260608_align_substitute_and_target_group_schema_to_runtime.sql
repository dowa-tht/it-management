-- Align dev schema to the current runtime contract for:
-- 1. approval_substitutes
-- 2. target-group legacy cleanup

begin;

-- ============================================================
-- 1) approval_substitutes -> match current app contract
-- ============================================================
alter table if exists public.approval_substitutes
  add column if not exists substitute_id uuid references public.user_profiles(id),
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists reason text;

update public.approval_substitutes
set
  substitute_id = coalesce(substitute_id, substitute_approver_id),
  start_date = coalesce(start_date, starts_at::date),
  end_date = coalesce(end_date, ends_at::date),
  reason = coalesce(reason, notes)
where
  substitute_id is null
  or start_date is null
  or end_date is null
  or reason is null;

create index if not exists idx_approval_substitutes_substitute_id
  on public.approval_substitutes(substitute_id);

create index if not exists idx_approval_substitutes_date_window
  on public.approval_substitutes(primary_approver_id, start_date, end_date);

alter table if exists public.approval_substitutes
  drop column if exists substitute_approver_id,
  drop column if exists starts_at,
  drop column if exists ends_at,
  drop column if exists notes;

-- ============================================================
-- 2) Legacy target-group cleanup -> match current app contract
-- ============================================================
alter table if exists public.checklist_template_targets
  drop constraint if exists checklist_template_targets_target_group_id_fkey;

alter table if exists public.checklist_template_targets
  drop column if exists target_group_id;

drop table if exists public.checklist_target_groups cascade;

commit;
