# Target Registry Standards

## Overview

Target Registry รองรับการทำ checklist แบบผูกกับ asset จริงและการสแกน QR โดยใช้โครงสร้างหลัก 2 ตาราง:

- `checklist_targets` สำหรับเก็บ asset/target จริง
- `checklist_template_targets` สำหรับเก็บ mapping ของ template ไปยัง target หรือ target type

> [!IMPORTANT]
> `checklist_target_groups` และ `scope_mode = per_group` ถูกยกเลิกแล้ว  
> มาตรฐานปัจจุบันรองรับเฉพาะ `global`, `per_target`, และ `per_type`

---

## Current Runtime Model

### 1. `checklist_targets`

ใช้เก็บทะเบียนอุปกรณ์/จุดตรวจ เช่น:

- `target_code`
- `target_type`
- `name`
- `location`
- `qr_value`
- `metadata`
- `is_active`

### 2. `checklist_templates`

แต่ละ template มี:

- `scope_mode`
- `target_type`
- `ui_template_type`
- `template_config`
- `validation_rules`
- `incident_rules`

### 3. `checklist_template_targets`

ตารางนี้รองรับ 2 รูปแบบ:

- `per_target`
  - `target_id` ต้องมีค่า
  - `target_type` ใช้เป็นข้อมูลประกอบได้
- `per_type`
  - `target_id` อนุญาตให้เป็น `null`
  - `target_type` ต้องมีค่า

ดังนั้น row ที่ `target_id = null` ไม่ใช่ orphan โดยอัตโนมัติ ถ้า row นั้นเป็น valid `per_type` mapping

---

## Scope Modes

| Mode | ความหมาย | Rule |
|---|---|---|
| `global` | ใช้กับทุก target | ไม่ต้องมี mappings |
| `per_target` | ผูกราย target | ต้องมี `target_id` |
| `per_type` | ผูกรายประเภทอุปกรณ์ | ต้องมี `target_type` และ `target_id` เป็น `null` ได้ |

---

## Validation Rules

Validation หลักถูกบังคับใน:

- [lib/checklistTemplateValidation.js](/C:/Users/Lenovo/dowa-it-system/lib/checklistTemplateValidation.js)
- [lib/procedurePlanValidation.js](/C:/Users/Lenovo/dowa-it-system/lib/procedurePlanValidation.js)

และ runtime actions ใน:

- [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js)
- [app/actions/target.js](/C:/Users/Lenovo/dowa-it-system/app/actions/target.js)

กติกาที่ต้องยึด:

1. `target_type` ต้องอยู่ใน `master_data.type = 'target_type'` หรืออยู่ใน baseline runtime values ที่ยืนยันแล้ว
2. `checklist_templates.category` ต้องสอดคล้องกับ `master_data.type = 'checklist_category'`
3. ห้ามมี mapping row ที่ `target_id` และ `target_type` ว่างพร้อมกัน

---

## Runtime Resolution

เมื่อระบบต้อง resolve template สำหรับ target ใด target หนึ่ง:

1. query direct mappings ด้วย `target_id`
2. query type mappings ด้วย `target_type`
3. รวมผลและตัด `template_id` ซ้ำ

ดังนั้น `per_type` mapping เป็น runtime contract จริงของระบบ ไม่ใช่เพียงข้อมูลประกอบ

---

## Related Migration Notes

- [supabase/migrations/20260521_remove_target_groups.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260521_remove_target_groups.sql) คือ migration หลักที่ถอด target groups และย้ายระบบไปสู่ `per_type`
- เอกสาร migration baseline ต้องตีความ `checklist_template_targets` ตาม runtime contract นี้เสมอ

---

*Last updated: 2026-06-09*
