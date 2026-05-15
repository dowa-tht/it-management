-- UAT Seed Script: Target Registry / QR Asset History
-- Purpose: Prepare demo data for non-production verification only
-- IMPORTANT: Review before execution. Do not run in production without approval.

begin;

-- 1) Seed target groups
insert into checklist_target_groups (group_code, group_name, target_type, description)
values
  ('GRP-CCTV-TERM', 'CCTV Terminal Boxes', 'cctv_terminal', 'ใช้สำหรับ checklist งานตรวจตู้ CCTV รายจุด'),
  ('GRP-NET-EDGE', 'Network Edge Devices', 'network_switch', 'ใช้สำหรับ checklist งานตรวจ network edge / switch')
on conflict do nothing;

-- 2) Seed targets
insert into checklist_targets (target_code, target_type, name, location, qr_value, metadata, is_active)
values
  (
    'CCTV-A-001',
    'cctv_terminal',
    'CCTV Terminal Box - Building A - Floor 1',
    'Building A / Floor 1 / North Wing',
    'CCTV-TERMINAL-CCTV-A-001',
    jsonb_build_object('building', 'A', 'floor', '1', 'zone', 'North Wing', 'uat_seed', true),
    true
  ),
  (
    'CCTV-B-002',
    'cctv_terminal',
    'CCTV Terminal Box - Building B - Floor 2',
    'Building B / Floor 2 / Server Corridor',
    'CCTV-TERMINAL-CCTV-B-002',
    jsonb_build_object('building', 'B', 'floor', '2', 'zone', 'Server Corridor', 'uat_seed', true),
    true
  ),
  (
    'UPS-MDF-001',
    'ups_rack',
    'UPS Rack - MDF Room',
    'Main MDF Room',
    'UPS-RACK-UPS-MDF-001',
    jsonb_build_object('room', 'MDF', 'device_class', 'UPS', 'uat_seed', true),
    true
  ),
  (
    'SW-IDF3A-001',
    'network_switch',
    'Access Switch - IDF 3A',
    'Building C / IDF 3A',
    'NETWORK-SWITCH-SW-IDF3A-001',
    jsonb_build_object('building', 'C', 'room', 'IDF 3A', 'device_class', 'Switch', 'uat_seed', true),
    true
  ),
  (
    'WLC-CAB-001',
    'controller_cabinet',
    'WiFi Controller Cabinet',
    'Data Center / Rack Zone B',
    'CONTROLLER-CABINET-WLC-CAB-001',
    jsonb_build_object('building', 'DC', 'rack_zone', 'B', 'device_class', 'Controller Cabinet', 'uat_seed', true),
    true
  )
on conflict (qr_value) do nothing;

-- 3) Template mappings are intentionally skipped in this safe seed revision.
-- Add checklist_template_targets records only after template IDs are reviewed and approved.

commit;
