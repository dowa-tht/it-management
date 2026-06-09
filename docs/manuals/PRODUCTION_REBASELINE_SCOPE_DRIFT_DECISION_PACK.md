# Production Re-baseline Scope Drift Decision Pack

เอกสารนี้สรุป drift ที่ตรวจพบจาก `dev Supabase` และ runtime code ระหว่างการสร้าง export artifacts รอบ `09-Jun-2026` เพื่อใช้ตัดสินใจก่อน lock execution runbook สำหรับ first production re-baseline

> [!IMPORTANT]
> เอกสารนี้อยู่ใน `Migration Planning Mode` เท่านั้น  
> ยังไม่ใช่คำสั่ง execute และยังห้ามแตะ production

---

## 1. Objective

ยืนยันว่า `approved migration scope` ต้องตรงกับ `runtime baseline` ที่ระบบใช้งานจริง มิฉะนั้นการ seed baseline รอบแรกจะเสี่ยงเกิด:

- master data ไม่พอสำหรับ checklist/template/target ที่มีอยู่จริง
- execution runbook ตีความ `per_type` mappings ผิดเป็น orphan rows
- production baseline ผ่าน schema แต่ใช้งานหน้าจอ settings/checklist ได้ไม่ครบ

---

## 2. Evidence Summary

### A. `target_type` source of truth ปัจจุบัน

หลักฐานจากโค้ด:

- [app/actions/target.js](/C:/Users/Lenovo/dowa-it-system/app/actions/target.js) โหลด `targetTypes` จาก `master_data.type = 'target_type'`
- [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js) สร้าง `targetTypes` โดย merge:
  - `master_data.type = 'target_type'`
  - `checklist_targets.target_type` ที่ใช้งานจริง
- [app/dashboard/settings/target-registry/TargetRegistryClient.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/target-registry/TargetRegistryClient.js) มี hardcoded defaults เพิ่ม `cctv_terminal_box`, `ups`, `nvr`, `switch`
- [supabase/migrations/20260521_remove_target_groups.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260521_remove_target_groups.sql) ตั้งใจย้าย `target_type` จาก live targets เข้า `master_data` และเพิ่ม defaults บางค่า

สรุป:

- runtime ไม่ได้ยึดเฉพาะ `master_data` แบบปิดตาย
- แต่ production baseline ที่ clean-reset ต้องมี `master_data.target_type` รองรับค่าที่ baseline data ใช้จริงด้วย

### B. `checklist_category` source of truth ปัจจุบัน

หลักฐานจากโค้ด:

- [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js) โหลด `categories` จาก `master_data.type = 'checklist_category'` เท่านั้น
- [app/dashboard/settings/checklist-template-builder/components/TemplateForm.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/checklist-template-builder/components/TemplateForm.js) dropdown หมวดหมู่ใช้ค่าจาก `categories` ที่ส่งมาจาก server โดยตรง

สรุป:

- `checklist_templates.category` ต้องสอดคล้องกับ `master_data.checklist_category`
- ถ้า baseline templates มีหมวดหมู่ที่ไม่อยู่ใน master data, production settings UI จะไม่สะท้อน baseline ถูกต้อง

### C. `checklist_template_targets.target_id = null`

หลักฐานจากโค้ด:

- [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js) เวลา save template จะ insert mapping โดยอนุญาต:
  - `target_id = t.target_id || null`
  - `target_type = t.target_type || template.target_type`
- [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js) เวลา resolve templates for target จะ query ทั้ง:
  - direct mapping ด้วย `target_id`
  - type mapping ด้วย `target_type`
- [app/dashboard/settings/checklist-template-builder/components/TemplateForm.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/checklist-template-builder/components/TemplateForm.js) ระบุชัดว่า `per_type` คือผูกกับทุกอุปกรณ์ที่มี `target_type` ตรงกัน

สรุป:

- row ใน `checklist_template_targets` ที่ `target_id = null` แต่ `target_type` มีค่า ไม่ใช่ orphan โดยอัตโนมัติ
- row ลักษณะนี้เป็น valid `per_type` mapping

---

## 3. Live Drift Confirmed on Dev

จาก artifact pack `brain/production-rebaseline/dev-export/20260609-092859/`

### A. `master_data.target_type` ยังแคบกว่าข้อมูลจริง

runtime baseline data ใช้ค่า:

- `cctv_terminal`
- `ac_server_room`
- `cctv_terminal_box`
- `network_teminal_box`

แต่ approved scope เดิมใน migration docs ยังโฟกัสเพียง:

- `cctv_terminal`
- `ac_server_room`

### B. `master_data.checklist_category` ยังแคบกว่าข้อมูลจริง

runtime baseline templates ใช้ค่า:

- `CCTV`
- `Infrastructure`
- `IT Infrastructure`
- `Microsoft 365`
- `Network`
- `Security`
- `Server & NAS`

แต่ snapshot ที่เคยใช้วางแผนยังไม่มี:

- `IT Infrastructure`
- `Security`

### C. `checklist_template_targets` row ที่ถูกตีความผิด

row `b62e5df7-528c-428a-ae7e-fd797e240d68`

- `target_id = null`
- `target_type = 'cctv_terminal'`

Decision:

- ถือเป็น valid `per_type` mapping
- ห้ามรายงาน row นี้เป็น orphan อีก

### D. `master_data` ยังขาด runtime values จริงใน dev

ผลตรวจล่าสุดจาก `dev Supabase` ยืนยันว่าใน `master_data` ยังไม่มี active rows เหล่านี้:

- `checklist_category = IT Infrastructure`
- `checklist_category = Security`
- `target_type = cctv_terminal_box`
- `target_type = network_teminal_box`

สรุป:

- ปัญหาไม่ได้มีแค่ `approved scope` แคบเกินไป
- แต่ source data ใน `dev master_data` ก็ยังไม่ครบตาม runtime baseline จริงด้วย

---

## 4. Decision

### Decision 1 — Expand approved master data scope

สำหรับ first production re-baseline ให้ถือว่า `master_data` ที่อยู่ใน scope ต้องรวมค่าที่ runtime baseline ใช้อยู่จริง ไม่ใช่ยึด snapshot เดิมที่แคบกว่า

### Decision 2 — Treat `per_type` mapping as valid

ในการ export/import `checklist_template_targets`:

- `target_id` อนุญาตให้เป็น `null` ได้
- แต่ต้องมี `target_type` เมื่อเป็น `per_type` row
- validation ใหม่ของ runbook ต้องตรวจแบบนี้แทน:
  - invalid ถ้า `target_id IS NULL` และ `target_type IS NULL`
  - invalid ถ้า parent template ไม่มีอยู่จริง
  - invalid ถ้า `target_type` ไม่อยู่ใน allowed set ของ baseline

### Decision 3 — Do not normalize `network_teminal_box` in first migration

แม้ชื่อจะสะกดผิด (`teminal`) แต่ runtime baseline ใช้ค่านี้อยู่จริง จึงควร carry forward แบบเดิมในรอบแรก

การ rename เป็น `network_terminal_box` ถ้าจะทำ ควรแยกเป็น post-baseline refactor/data migration อีกชุด

### Decision 4 — Require source supplementation before execution-grade export

ก่อน lock final export artifacts สำหรับวัน execute จริง ต้องเลือกอย่างใดอย่างหนึ่ง:

1. เติม rows ที่ขาดใน `dev master_data` ก่อน แล้ว export ใหม่
2. หรือสร้าง `master_data supplement pack` แยกจาก raw export เพื่อเติม 4 values นี้ระหว่าง baseline seed

คำแนะนำที่ถูกเลือกใน planning pack ปัจจุบัน:

- ใช้ `explicit supplement pack` สำหรับ 4 values นี้ และบันทึกเป็น execution-grade artifact
- เหตุผล: connector dev ที่มีอยู่ตอนนี้ไม่อนุญาต `INSERT` (`read-only transaction`) จึงควร lock ค่าเหล่านี้ไว้ใน artifact/runbook แทน

---

## 5. Recommended Scope Lock Update

### `master_data.type = 'target_type'`

เพิ่ม approved values เป็นอย่างน้อย:

- `cctv_terminal`
- `ac_server_room`
- `cctv_terminal_box`
- `network_teminal_box`

### `master_data.type = 'checklist_category'`

เพิ่ม approved values เป็นอย่างน้อย:

- `CCTV`
- `Infrastructure`
- `IT Infrastructure`
- `Microsoft 365`
- `Network`
- `Security`
- `Server & NAS`

---

## 6. Execution Impact

ก่อน execution runbook จริง ต้องใช้กติกาใหม่ดังนี้:

1. export `master_data` ให้ครอบคลุม runtime-referenced `target_type` และ `checklist_category`
2. verify ว่า baseline templates ทุก row อ้าง category ที่มีใน exported `master_data`
3. verify ว่า baseline targets และ template mappings ทุก row อ้าง `target_type` ที่มีใน exported `master_data`
4. treat `checklist_template_targets` rows แบบ `target_id = null, target_type != null` เป็น valid `per_type` rows
5. ถ้า `dev master_data` ยังขาด 4 values ข้างต้น ให้ถือว่า artifact pack เป็น execution-grade ได้ก็ต่อเมื่อมี `master_data supplement pack` แนบอยู่ครบ

---

## 7. Related Documents to Update

- `docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md`
- `docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md`
- `docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md`
- `docs/standards/TARGET_REGISTRY.md`
