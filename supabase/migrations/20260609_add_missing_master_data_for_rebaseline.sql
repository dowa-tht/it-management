-- Migration: Add missing master data values required by production re-baseline baseline pack
-- Date: 2026-06-09

-- Clean up any duplicates caused by multiple runs of earlier scripts
DELETE FROM public.master_data
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid
  FROM public.master_data
  GROUP BY type, value
);

-- Add unique constraint so ON CONFLICT works
alter table public.master_data drop constraint if exists master_data_type_value_key;
alter table public.master_data add constraint master_data_type_value_key unique (type, value);

insert into public.master_data (type, value, sort_order, is_active)
values
  ('checklist_category', 'IT Infrastructure', 1, true),
  ('checklist_category', 'Security', 2, true),
  ('target_type', 'cctv_terminal_box', 3, true),
  ('target_type', 'network_teminal_box', 4, true)
on conflict (type, value)
do update
set
  sort_order = excluded.sort_order,
  is_active = true;
