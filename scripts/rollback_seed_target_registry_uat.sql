-- Rollback Script: Target Registry / QR Asset History UAT Seed
-- Purpose: Remove only UAT seed data created by `scripts/seed_target_registry_uat.sql`
-- IMPORTANT: Review before execution. Intended for non-production cleanup only.

begin;

-- 1) Remove template mappings that point to UAT seeded targets/groups
delete from checklist_template_targets
where target_id in (
  select id
  from checklist_targets
  where coalesce((metadata->>'uat_seed')::boolean, false) = true
)
or target_group_id in (
  select id
  from checklist_target_groups
  where group_code in ('GRP-CCTV-TERM', 'GRP-NET-EDGE')
);

-- 2) Remove UAT seeded targets
delete from checklist_targets
where coalesce((metadata->>'uat_seed')::boolean, false) = true
  and target_code in (
    'CCTV-A-001',
    'CCTV-B-002',
    'UPS-MDF-001',
    'SW-IDF3A-001',
    'WLC-CAB-001'
  );

-- 3) Remove UAT seeded groups
delete from checklist_target_groups
where group_code in ('GRP-CCTV-TERM', 'GRP-NET-EDGE');

commit;
