# Production Re-baseline Production Mode Readiness

เอกสารนี้ใช้สรุปสถานะความพร้อมล่าสุดก่อนให้ USER เลือกเข้าสู่ `Production Migration Mode`

> [!IMPORTANT]
> เอกสารนี้ไม่ใช่การยืนยันให้ execute ทันที  
> ต้องรอ USER เลือก `Production Migration Mode` ก่อนทุกครั้ง

---

## 1. Readiness Summary

สถานะล่าสุด: `READY FOR PRODUCTION MIGRATION MODE ENTRY`

ความหมาย:

- planning documents ครบแล้ว
- execution runbook ครบแล้ว
- selected-user pack ครบแล้ว
- baseline export pack มีทั้ง raw data และ supplement/gap resolution ที่จำเป็น
- ไม่มี open blocker เชิง logic ที่ต้องรอค้นต่อก่อนเข้า production mode

---

## 2. Remaining Human Gate

ก่อนลงมือกับ production จริง ยังต้องมี:

1. USER เลือก `Production Migration Mode`
2. operator backup production repo / DB ตาม runbook
3. operator execute schema + seed ตาม phase order

---

## 3. Verified Planning Gates

### Passed

- `workflow_configs.condition_key` verified
- `approval_substitutes` runtime schema verified
- target-group removal drift closed
- selected users scope verified
- `checklist_template_targets` null `target_id` handling clarified as valid `per_type` behavior
- runtime-referenced `master_data` gaps captured and resolved with supplement pack

### Resolved by Supplement Pack

ค่าที่ยังไม่มีใน live dev `master_data` แต่ถูก lock ไว้ใน execution-grade artifact แล้ว:

- `checklist_category = IT Infrastructure`
- `checklist_category = Security`
- `target_type = cctv_terminal_box`
- `target_type = network_teminal_box`

---

## 4. Execution-Grade Artifacts

อ้างอิง artifact pack:

- `brain/production-rebaseline/dev-export/20260609-092859/01-metadata/`
- `brain/production-rebaseline/dev-export/20260609-092859/02-baseline-tables/`
- `brain/production-rebaseline/dev-export/20260609-092859/03-workflow-and-series/`
- `brain/production-rebaseline/dev-export/20260609-092859/04-selected-users/`
- `brain/production-rebaseline/dev-export/20260609-092859/07-verification/`

artifact สำคัญที่ต้องใช้:

- `release_inventory.json`
- `artifact_resolution_notes.json`
- `master_data.json`
- `master_data_supplement.json`
- `master_data_supplement.sql`
- `workflow_configs.json`
- `no_series*.json`
- `auth_users.json`
- `user_profiles.json`
- `user_whitelist.json`
- `schema_findings.json`

---

## 5. Operator Note

สำหรับวัน execute จริง:

- ให้ apply `master_data_supplement.sql` เป็นส่วนหนึ่งของ `master_data` seed block
- ห้ามตัด `network_teminal_box` ออกหรือ rename ระหว่างรอบแรก
- ให้ใช้กติกา `per_type` mapping ตาม `TARGET_REGISTRY.md` ฉบับล่าสุด

---

## 6. Final Planning Decision

เมื่อ USER พร้อม สามารถเริ่มด้วย prompt เลือกโหมด แล้วเข้าสู่:

- `3 = Production Migration Mode`

หลังจากนั้นค่อยเริ่ม runbook phase A ได้
