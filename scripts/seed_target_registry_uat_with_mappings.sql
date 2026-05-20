-- UAT Seed for Target Registry with Mappings
-- Generated on 2026-05-14

-- 1. Create Target Groups
INSERT INTO checklist_target_groups (id, group_code, group_name, target_type, description)
VALUES
  ('g1111111-1111-1111-1111-111111111111', 'GRP-CCTV-01', 'CCTV Terminal Group 1', 'cctv_terminal', 'กลุ่มตู้ CCTV โซน A'),
  ('g2222222-2222-2222-2222-222222222222', 'GRP-AC-SRV', 'Server Room AC Group', 'ac_server_room', 'กลุ่มแอร์ห้องเซิร์ฟเวอร์')
ON CONFLICT DO NOTHING;

-- 2. Create Targets
INSERT INTO checklist_targets (id, target_code, target_type, name, location, qr_value, metadata)
VALUES
  ('t1111111-1111-1111-1111-111111111111', 'CCTV-TERM-01', 'cctv_terminal', 'CCTV Terminal 01', 'Zone A - Gate 1', 'QR-CCTV-01', '{"ip": "10.0.1.101"}'),
  ('t1111111-1111-1111-1111-111111111112', 'CCTV-TERM-02', 'cctv_terminal', 'CCTV Terminal 02', 'Zone A - Gate 2', 'QR-CCTV-02', '{"ip": "10.0.1.102"}'),
  ('t1111111-1111-1111-1111-111111111113', 'CCTV-TERM-03', 'cctv_terminal', 'CCTV Terminal 03', 'Zone A - Parking', 'QR-CCTV-03', '{"ip": "10.0.1.103"}'),
  ('t1111111-1111-1111-1111-111111111114', 'CCTV-TERM-04', 'cctv_terminal', 'CCTV Terminal 04', 'Zone A - Lobby', 'QR-CCTV-04', '{"ip": "10.0.1.104"}'),
  ('t1111111-1111-1111-1111-111111111115', 'CCTV-TERM-05', 'cctv_terminal', 'CCTV Terminal 05', 'Zone A - Backdoor', 'QR-CCTV-05', '{"ip": "10.0.1.105"}'),
  ('t2222222-2222-2222-2222-222222222221', 'AC-SRV-001', 'ac_server_room', 'Server Room AC 01', 'Server Room 1', 'QR-AC-SRV-001', '{"model": "CoolMaster X"}')
ON CONFLICT DO NOTHING;

-- 3. Create Sample Templates (if not exist)
INSERT INTO checklist_templates (id, category, freq_type, item_label, instruction, ui_template_type, template_config, scope_mode, target_type, item_key)
VALUES
  ('temp1111-1111-1111-1111-111111111111', 'Security', 'daily', 'Daily CCTV Terminal Check', 'ตรวจสอบสภาพตู้ CCTV ประจำวัน', 1, '{"min_photos": 1, "photo_points": [{"label": "สภาพตู้ภายนอก", "point_code": "P01"}]}', 'per_group', 'cctv_terminal', 'cctv_daily_check'),
  ('temp2222-2222-2222-2222-222222222222', 'IT Infrastructure', 'monthly', 'Monthly Server AC Maintenance', 'บำรุงรักษาแอร์ห้องเซิร์ฟเวอร์ประจำเดือน', 0, '{"allow_na": false, "severity": "high"}', 'per_target', 'ac_server_room', 'ac_monthly_maint')
ON CONFLICT DO NOTHING;

-- 4. Map Templates to Targets/Groups with override_config
-- Map CCTV Template to CCTV Group
INSERT INTO checklist_template_targets (template_id, target_group_id, target_type)
VALUES
  ('temp1111-1111-1111-1111-111111111111', 'g1111111-1111-1111-1111-111111111111', 'cctv_terminal')
ON CONFLICT DO NOTHING;

-- Map CCTV Template to individual CCTV targets with specific overrides (e.g. some need more photos)
INSERT INTO checklist_template_targets (template_id, target_id, target_type, override_config)
VALUES
  ('temp1111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'cctv_terminal', '{"ui_template_type": 1, "template_config": {"min_photos": 2, "photo_points": [{"label": "สภาพตู้ภายนอก", "point_code": "P01"}, {"label": "สวิตช์ภายใน", "point_code": "P02"}]}}'),
  ('temp1111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111112', 'cctv_terminal', '{"ui_template_type": 1, "template_config": {"min_photos": 1, "photo_points": [{"label": "สภาพตู้ภายนอก", "point_code": "P01"}]}}')
ON CONFLICT DO NOTHING;

-- Map AC Template to AC Target
INSERT INTO checklist_template_targets (template_id, target_id, target_type, override_config)
VALUES
  ('temp2222-2222-2222-2222-222222222222', 't2222222-2222-2222-2222-222222222221', 'ac_server_room', '{"ui_template_type": 3, "template_config": {"unit": "°C", "min": 18, "max": 25, "fail_mode": "outside_range"}}')
ON CONFLICT DO NOTHING;


-- 5. Add Master Data for Target Types (so they can be selected in the UI)
INSERT INTO master_data (type, value, sort_order)
VALUES
  ('target_type', 'cctv_terminal', 1),
  ('target_type', 'ac_server_room', 2)
ON CONFLICT DO NOTHING;
