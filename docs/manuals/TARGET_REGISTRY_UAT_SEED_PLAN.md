# Target Registry UAT Seed Plan

## Purpose

เอกสารนี้ใช้สำหรับเตรียมข้อมูล UAT ของ Target Registry / QR Asset History **โดยยังไม่ insert ข้อมูลจริงลง database** เพื่อให้ทีมสามารถ review โครงสร้างข้อมูล, naming convention, และ test scenarios ก่อน execute จริง

---

## Scope

ครอบคลุมการเตรียมข้อมูลตัวอย่างสำหรับ:

1. `checklist_targets`
2. `checklist_target_groups`
3. `checklist_template_targets`
4. QR lookup flow
5. Asset History timeline verification

---

## Proposed UAT Targets

### 1. CCTV Terminal Box – Building A
- `target_code`: `CCTV-A-001`
- `target_type`: `cctv_terminal`
- `name`: `CCTV Terminal Box - Building A - Floor 1`
- `location`: `Building A / Floor 1 / North Wing`
- `qr_value`: `CCTV-TERMINAL-CCTV-A-001`

### 2. CCTV Terminal Box – Building B
- `target_code`: `CCTV-B-002`
- `target_type`: `cctv_terminal`
- `name`: `CCTV Terminal Box - Building B - Floor 2`
- `location`: `Building B / Floor 2 / Server Corridor`
- `qr_value`: `CCTV-TERMINAL-CCTV-B-002`

### 3. UPS Rack – MDF Room
- `target_code`: `UPS-MDF-001`
- `target_type`: `ups_rack`
- `name`: `UPS Rack - MDF Room`
- `location`: `Main MDF Room`
- `qr_value`: `UPS-RACK-UPS-MDF-001`

### 4. Access Switch – IDF 3A
- `target_code`: `SW-IDF3A-001`
- `target_type`: `network_switch`
- `name`: `Access Switch - IDF 3A`
- `location`: `Building C / IDF 3A`
- `qr_value`: `NETWORK-SWITCH-SW-IDF3A-001`

### 5. WiFi Controller Cabinet
- `target_code`: `WLC-CAB-001`
- `target_type`: `controller_cabinet`
- `name`: `WiFi Controller Cabinet`
- `location`: `Data Center / Rack Zone B`
- `qr_value`: `CONTROLLER-CABINET-WLC-CAB-001`

---

## Proposed Target Groups

### Group A: CCTV Terminal Boxes
- `group_code`: `GRP-CCTV-TERM`
- `group_name`: `CCTV Terminal Boxes`
- `target_type`: `cctv_terminal`
- `description`: `ใช้สำหรับ checklist งานตรวจตู้ CCTV รายจุด`

### Group B: Network Edge Devices
- `group_code`: `GRP-NET-EDGE`
- `group_name`: `Network Edge Devices`
- `target_type`: `network_switch`
- `description`: `ใช้สำหรับ checklist งานตรวจ network edge / switch`

---

## Proposed Template Mapping Strategy

### For `cctv_terminal`
ผูก template ที่เหมาะสมดังนี้:

1. `T1 Photo Evidence`
   - ภาพหน้าตู้
   - ภาพภายในตู้
   - ภาพสาย/label
2. `T0 Standard`
   - ตรวจสภาพภายนอก
   - ตรวจสถานะการปิดล็อก
3. `T2 Procedure Table`
   - SOP การเปิด/ตรวจ/ปิดตู้

### For `ups_rack`
1. `T3 Measurement`
   - voltage / temperature / battery status
2. `T1 Photo Evidence`
   - ภาพ rack และ indicator panel

### For `network_switch`
1. `T4 Link Verification`
   - management URL / portal check
2. `T1 Photo Evidence`
   - ภาพ port status / cable condition

---

## UAT Execution Checklist

### Phase 1 — Master Data Review
- ตรวจว่ารหัส `target_code` ไม่ซ้ำกัน
- ตรวจว่า `qr_value` ไม่ซ้ำกัน
- ตรวจว่า `target_type` ใช้ naming convention เดียวกันทุก record
- ตรวจว่า location format สม่ำเสมอ

### Phase 2 — Mapping Review
- ตรวจว่า template ที่ใช้กับ `cctv_terminal` ครบตาม use case
- ตรวจว่า group mapping ไม่ซ้ำซ้อนกับ direct target mapping โดยไม่จำเป็น
- ตรวจว่า template ที่เลือกไม่ขัดกับ `scope_mode`

### Phase 3 — QR / History Review
- scan QR แล้ว resolve ไป target ได้ถูกตัว
- เปิดหน้า Asset History ของ target แล้วเห็น document timeline ได้
- ถ้ามี photo evidence ต้องเห็นรูปย้อนหลังใน gallery
- ถ้ามีหลายรอบตรวจ ต้องเรียงลำดับตาม `period_date` ล่าสุดก่อน

---

## Recommended Non-Production Rollout Order

1. สร้าง target groups ก่อน
2. สร้าง targets
3. ผูก template mappings
4. สร้าง checklist docs ทดลอง 1-2 รอบต่อ target
5. ตรวจ QR lookup
6. ตรวจ Asset History timeline และ photo gallery

---

## Pre-Execution Verification Checklist

ก่อน execute [`scripts/seed_target_registry_uat.sql`](scripts/seed_target_registry_uat.sql) ให้ตรวจตามนี้:

1. ยืนยันว่า environment เป็น UAT / non-production เท่านั้น
2. backup schema/data snapshot ล่าสุดไว้ก่อน
3. เปิดอ่าน [`scripts/seed_target_registry_uat.sql`](scripts/seed_target_registry_uat.sql) ทั้งไฟล์ก่อน execute
4. ตรวจว่าค่า `target_code` ต่อไปนี้ยังไม่ชนกับข้อมูลจริง:
   - `CCTV-A-001`
   - `CCTV-B-002`
   - `UPS-MDF-001`
   - `SW-IDF3A-001`
   - `WLC-CAB-001`
5. ตรวจว่าค่า `qr_value` ทั้งหมดใน seed ยังไม่ชนกับ record เดิม
6. ตรวจว่า template IDs ที่จะใช้ mapping ถูกต้องจริงก่อนแทนค่า placeholder ใน [`scripts/seed_target_registry_uat.sql`](scripts/seed_target_registry_uat.sql)
7. เตรียม rollback script [`scripts/rollback_seed_target_registry_uat.sql`](scripts/rollback_seed_target_registry_uat.sql) ไว้พร้อมใช้งานก่อน execute
8. หลัง execute ต้อง query ตรวจผลทันทีทั้ง target groups, targets, mappings และ QR lookup

---

## Rollback Plan

หากผล UAT ไม่ถูกต้อง หรือมีข้อมูลตัวอย่างไม่ต้องการแล้ว ให้ใช้ [`scripts/rollback_seed_target_registry_uat.sql`](scripts/rollback_seed_target_registry_uat.sql)

ลำดับ rollback:
1. ลบ `checklist_template_targets` ที่ชี้มายัง UAT targets / groups
2. ลบ UAT targets ที่ mark `metadata.uat_seed = true`
3. ลบ UAT target groups ที่สร้างจาก script นี้

หมายเหตุ:
- rollback script นี้ไม่แตะข้อมูล production record อื่นนอกเหนือจากรายการที่กำหนดไว้ชัดเจน
- หากมีการสร้าง checklist docs จริงผูกกับ target เหล่านี้ภายหลัง ต้องประเมิน impact เพิ่มเติมก่อน rollback

---

## Important Notes

- ห้ามใช้ข้อมูล production จริงใน UAT seed ชุดแรก
- แนะนำให้เริ่มจาก `cctv_terminal` ก่อน เพราะเป็น use case หลักของ phase นี้
- หากจะ insert จริงในรอบถัดไป ให้ใช้ SQL script [`scripts/seed_target_registry_uat.sql`](scripts/seed_target_registry_uat.sql) และ review template mapping placeholders ก่อน execute
- หากต้อง revert ให้ใช้ [`scripts/rollback_seed_target_registry_uat.sql`](scripts/rollback_seed_target_registry_uat.sql)
- หลัง insert จริง ต้องอัปเดต [`docs/history/CHANGELOG.md`](docs/history/CHANGELOG.md) และ [`docs/history/USER_TASKS.md`](docs/history/USER_TASKS.md) ทุกครั้ง
