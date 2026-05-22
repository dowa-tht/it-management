# Implementation Plan - Complete Removal of Target Groups & Transition to per_type Mapping

This plan outlines the steps to remove "Target Groups" completely from the system and replace the `per_group` mapping mode with a dynamic `per_type` mapping mode. Templates will map to all targets of a given target type. Target types will be stored and managed dynamically in the `master_data` table under `type = 'target_type'`.

---

## Model Suitability Alert

> [!IMPORTANT]
> **Model Suitability Alert**
>
> - **งานนี้มีความเสี่ยงระดับ**: Critical (มีการเปลี่ยน DB Schema, ลบ Table/Column, ปรับโครงสร้าง RLS/Relation, และแก้ไข Core Server Actions ที่มีผลต่อ Business logic)
> - **Model ปัจจุบัน**: Antigravity (Reasoning AI)
> - **เหตุผลความเสี่ยง**: เป็นการลบข้อมูล/โครงสร้างเดิมและแปลงระบบการผูก template ใหม่ทั้งหมด ซึ่งจำเป็นต้องตรวจสอบ integrity ของ database, server actions และ validation rules แบบ line-by-line เพื่อไม่ให้เกิด compile/runtime crash หรือข้อมูล UAT สูญหาย
>
> **ตัวเลือก**:
> 1) ยืนยันใช้ model ปัจจุบันต่อ (แนะนำ - เนื่องจากเป็นโมเดลสำหรับงาน Critical)
> 2) สลับไป model ที่เหมาะกว่า แล้วค่อยดำเนินการ

---

## User Review Required

> [!IMPORTANT]
> **การโอนย้ายข้อมูลเดิม (Data Migration & Backward Compatibility)**
>
> 1. **การลบตาราง `checklist_target_groups`**: ตารางนี้และข้อมูล Group ทั้งหมดจะถูกลบออกจากระบบโดยถาวร
> 2. **การลบฟิลด์ `target_group_id`**: จะถูกลบออกจาก `checklist_targets` และ `checklist_template_targets`
> 3. **การแปลงข้อมูล `per_group` เดิม**: สำหรับ Checklist Template หรือ Procedure Plan เดิมที่เคยตั้งค่าไว้เป็น `per_group` จะถูกเปลี่ยนเป็น `per_type` อัตโนมัติ โดยอ้างอิงจาก `target_type` ของกลุ่มนั้นๆ
> 4. **การควบคุมความถี่ที่ทับซ้อนกัน (Overlap Validation)**: ระบบ overlap validation จะเปลี่ยนจากการเช็กระดับ target/group เป็นการเช็กระดับ target type (ถ้าใช้ `per_type`) ร่วมกับ target รายเครื่อง (ถ้าใช้ `per_target`)

---

## Open Questions

- *ไม่มีคำถามเพิ่มเติม (Requirements ครบถ้วนแล้ว)*

---

## Proposed Changes

### 💾 1. Database Migration

#### [NEW] [migration_remove_target_groups.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260521_remove_target_groups.sql)
สร้าง SQL script สำหรับแก้ไขโครงสร้าง database ดังนี้:
```sql
-- 1. ย้ายประเภทอุปกรณ์ (target_type) เดิมที่อยู่ในระบบไปเก็บใน master_data (ถ้าไม่มีอยู่ก่อน)
INSERT INTO public.master_data (type, value, sort_order, is_active)
SELECT DISTINCT 'target_type', target_type, 0, true
FROM public.checklist_targets
WHERE target_type IS NOT NULL AND target_type != ''
AND NOT EXISTS (
  SELECT 1 FROM public.master_data WHERE type = 'target_type' AND value = target_type
)
ON CONFLICT DO NOTHING;

-- 2. ย้ายค่า default target types เพิ่มเติม (cctv_terminal_box, ups, nvr, switch)
INSERT INTO public.master_data (type, value, sort_order, is_active)
VALUES 
  ('target_type', 'cctv_terminal_box', 1, true),
  ('target_type', 'ups', 2, true),
  ('target_type', 'nvr', 3, true),
  ('target_type', 'switch', 4, true)
ON CONFLICT DO NOTHING;

-- 3. อัปเดต checklist_templates และ checklist_procedure_plans ที่เป็น per_group ให้เป็น per_type
UPDATE public.checklist_templates
SET scope_mode = 'per_type'
WHERE scope_mode = 'per_group';

UPDATE public.checklist_procedure_plans
SET scope_mode = 'per_type'
WHERE scope_mode = 'per_group';

-- 4. ลบ Foreign Key constraints เดิมบน target_group_id
ALTER TABLE IF EXISTS public.checklist_targets 
  DROP CONSTRAINT IF EXISTS checklist_targets_target_group_id_fkey;

ALTER TABLE IF EXISTS public.checklist_template_targets 
  DROP CONSTRAINT IF EXISTS checklist_template_targets_target_group_id_fkey;

-- 5. ลบ Column target_group_id ออก
ALTER TABLE IF EXISTS public.checklist_targets 
  DROP COLUMN IF EXISTS target_group_id;

ALTER TABLE IF EXISTS public.checklist_template_targets 
  DROP COLUMN IF EXISTS target_group_id;

-- 6. ลบตาราง checklist_target_groups ออกถาวร
DROP TABLE IF EXISTS public.checklist_target_groups CASCADE;
```

---

### 🛡️ 2. Validation Refactoring

#### [MODIFY] [checklistTemplateValidation.js](file:///c:/Users/Lenovo/dowa-it-system/lib/checklistTemplateValidation.js)
- เปลี่ยน `scope_mode` ใน enum ให้รับ `per_type` แทน `per_group`
- อัปเดต `templateTargetMappingSchema` ให้ลบ `target_group_id` และ refine logic ที่ผูกกับ target_id
- อัปเดต `normalizeTemplateRecord` ให้รองรับ `per_type`

```diff
-  target_group_id: z.string().uuid().optional().nullable(),
   target_type: z.string().trim(),
   override_config: overrideConfigSchema,
   is_active: z.boolean().default(true)
-}).refine(data => data.target_id || data.target_group_id, {
-  message: 'Must specify either target_id or target_group_id'
+})
```

#### [MODIFY] [procedurePlanValidation.js](file:///c:/Users/Lenovo/dowa-it-system/lib/procedurePlanValidation.js)
- เปลี่ยน `scope_mode` ใน `procedurePlanSchema` จาก `per_group` เป็น `per_type`

---

### ⚙️ 3. Server Actions Refactoring

#### [MODIFY] [checklist-template.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js)
- อัปเดต `getTemplatesForTarget(targetId)` เพื่อดึง template ที่ตรงกับ `targetId` หรือเป็นแบบ `per_type` ที่มี `target_type` ตรงกับประเภทของ target
- อัปเดต `getChecklistTemplateBuilderPageData()`:
  - ลบการ query ตาราง `checklist_target_groups`
  - ดึง `targetTypes` จากตาราง `master_data` (ที่ `type = 'target_type'`)
- อัปเดต `saveChecklistTemplate(payload)`:
  - แก้ไข logic ตรวจสอบ overlap ความถี่การตรวจ (Frequency Overlap) ให้รองรับ `per_type` และ `per_target`
  - ลบการจัดการ `target_group_id` ใน array `mappingsToInsert`

#### [MODIFY] [target.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/target.js)
- ลบ `saveChecklistTargetGroup` และ logic การจัดการ group
- แก้ไข `getTargetRegistryPageData()`:
  - ลบการ query `checklist_target_groups`
  - ดึง `targetTypes` จาก `master_data`
- เพิ่ม Server Action `deleteChecklistTarget(targetId)`: ตรวจสอบก่อนว่า target ถูกใช้ในเอกสารใบงาน (`checklist_docs`) หรือยัง หากยังไม่มีให้ทำการลบ (รวมถึงลบใน `checklist_template_targets` ด้วย) หากมีเอกสารอยู่แล้วจะแจ้งเตือนและแนะให้ Deactivate แทน
- เพิ่ม Server Actions `addTargetType(value)` และ `deleteTargetType(value)` สำหรับการบริหารจัดการ Target Type แบบ Dynamic

#### [MODIFY] [public-checklist.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/public-checklist.js)
- ปรับปรุงการหา checklist template ที่เกี่ยวข้องใน `resolveChecklistQr` หรือ lookup:
  - นำ `target_group_id` query ออก
  - ค้นหา template ตาม `scope_mode = 'per_type'` และ `target_type` ที่ตรงกับ target

---

### 🎨 4. UI Client & Forms Redesign

#### [MODIFY] [TargetRegistryClient.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/target-registry/TargetRegistryClient.js)
- เอา UI Tab "Groups" และ `GroupForm` ออกทั้งหมด
- ใน Sidebar, แสดงรายการ Target จัดกลุ่มตาม `target_type`
- เพิ่มปุ่มบริหารจัดการ Target Type (สามารถเพิ่ม/ลบประเภทอุปกรณ์ได้โดยตรงผ่าน modal/UI ขนาดเล็ก)
- ปรับปรุงฟิลด์ Target Type ของ Target Form ให้ดึงจากข้อมูล dynamic `targetTypes` (ผ่าน searchable dropdown แทน datalist)
- เพิ่มปุ่ม **Delete Target** หรือ **Deactivate Target** ที่ Form Footer (ทำงานร่วมกับ server action ตรวจ references)

#### [MODIFY] [TemplateForm.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/checklist-template-builder/components/TemplateForm.js)
- เปลี่ยนตัวเลือก Scope Mode จาก "per_group" เป็น "per_type"
- เอา UI ส่วนเลือก Target Groups ออก
- เมื่อเลือก `per_type` ให้ใช้ dropdown เลือก `Target type` เพื่อคุมการแมป (ไม่ต้องมี checkboxes ของอุปกรณ์รายตัว)
- การแสดง checkbox รายตัวจะทำเฉพาะเมื่อเป็น `per_target` เท่านั้น

#### [MODIFY] [page.js (checklist-template-builder)](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/checklist-template-builder/page.js) และ [page.js (target-registry)](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/target-registry/page.js)
- เอา `initialGroups` หรือ `targetGroups` ออกจาก props ของ components

---

### 🧪 5. Test Files Update

#### [MODIFY] [target-registry.test.js](file:///c:/Users/Lenovo/dowa-it-system/tests/target-registry.test.js)
- เปลี่ยน test case ของ `per_group` ใน `validateProcedurePlanInput` ให้ใช้ `per_type`
- ปรับแต่ง mock data และ assertions ให้สอดคล้องกับ schema ล่าสุด

---

## Verification Plan

### Automated Tests
- รัน `npm test` เพื่อให้แน่ใจว่าระบบ validator และ actions ทั้งหมดรันผ่าน 100%

### Manual Verification
1. **Database Migration**: ตรวจสอบโครงสร้าง DDL ผ่าน local environment
2. **Target Registry UI**:
   - ลองเพิ่มประเภทอุปกรณ์ใหม่ และลบประเภทอุปกรณ์ที่ไม่ได้ใช้งาน
   - ลงทะเบียน Target ภายใต้ประเภทอุปกรณ์ที่กำหนด
   - ทำการกดลบ Target ที่เพิ่งสร้าง (ลบได้สำเร็จ) และลองลบ Target ที่มีประวัติการตรวจ (ระบบต้องแจ้งเตือนไม่ให้ลบและแนะนำ deactivate)
3. **Template Builder**:
   - สร้าง template แบบ `per_type` และเลือกประเภทอุปกรณ์
   - สร้าง template แบบ `per_target` และเลือกอุปกรณ์รายตัว
   - ทดสอบ overlap frequency guard (เช่น ห้ามมี template ที่ตรวจแบบ 'Daily' ของ cctv_terminal ซ้ำกัน)
4. **Execution Test**:
   - เข้าหน้า Checklist และยืนยันว่า templates แบบ `per_type` สามารถสร้าง Checklist session และรายการตรวจสอบสำหรับอุปกรณ์ประเภทนั้นๆ ได้ถูกต้องตามเป้าหมาย
