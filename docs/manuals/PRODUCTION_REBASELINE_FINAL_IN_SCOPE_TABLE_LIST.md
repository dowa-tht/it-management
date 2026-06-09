# Production Re-baseline Final In-Scope Table List

เอกสารนี้เป็นต้นฉบับสำหรับใช้ประกอบ `Execution Runbook` ของการทำ `Production Re-baseline Migration` ครั้งแรก โดยสรุปเฉพาะตารางที่อยู่ใน scope พร้อม action, fields, dependency, และข้อควรระวัง

---

## Scope Summary

- Environment ต้นทาง: `Development`
  - Repo: `trush000/dowa-it-system`
  - Supabase: `fhcsvvlwhwqzlsltrkuq`
- Environment ปลายทาง: `Production`
  - Repo: `dowa-tht/it-management`
  - Supabase: `yrgsukhjkoexvdybyyjm`
- Migration Model:
  - reset production repo และ production DB
  - apply schema chain ทั้งหมด
  - seed `green scope` ทั้งหมด
  - migrate selected users เฉพาะ `admin@dowa-tht.co.th` และ `natthawut@dowa-tht.co.th`
  - ไม่ย้าย transaction data
  - ไม่ย้าย audit/log history
  - reset PIN / onboarding / recovery / OTP state

---

## Action Legend

| Action | ความหมาย |
|---|---|
| `schema-only` | สร้างจาก migration chain เท่านั้น ไม่ seed data จาก dev |
| `seed-all` | ย้ายข้อมูลทั้งหมดจาก dev ตาม scope ที่อนุมัติ |
| `seed-selected` | ย้ายเฉพาะ record ที่ถูกเลือก |
| `reset-empty` | ให้ปลายทางเริ่มว่าง ไม่ย้ายข้อมูล |
| `verify-first` | ห้าม migrate จนกว่าจะตรวจ schema/data จริงใน dev DB ก่อน |

---

## Final In-Scope Table List

| Table | Action | Fields | Dependency | Note |
|---|---|---|---|---|
| `system_settings` | `seed-all` | `key`, `value` | apply schema chain ก่อน | ย้ายเฉพาะ baseline keys: `working_hours`, `sla_limits`, `working_hours_guide_content`, `holidays_guide_content`, `workflow_guide_content`, `permissions_guide_content`, `no_series_guide_content`, `substitutes_guide_content`, และ `*_guide_content` ของ master data scope |
| `master_data` | `seed-all` | `type`, `value`, `sort_order`, `is_active` | apply schema chain ก่อน | in-scope types: `incident_category`, `affected_system`, `sla_exclusion_reason`, `checklist_category`, `target_type`; สำหรับ first re-baseline ต้องครอบคลุม runtime values ที่ baseline ใช้จริง เช่น `IT Infrastructure`, `Security`, `cctv_terminal_box`, `network_teminal_box` |
| `holidays` | `seed-all` | `holiday_date`, `description` | apply schema chain ก่อน | เป็น baseline ของ SLA/work calendar |
| `workflow_configs` | `seed-all` | `doc_type`, `target_type`, `condition_value`, `step_order`, `role_required`, `approver_id`, `is_active` | schema chain ก่อน, selected users ควรพร้อมก่อนถ้า `approver_id` อ้าง 2 users นี้ | ต้อง verify schema จริงเรื่อง `condition_key` ก่อน runbook |
| `permission_sets` | `seed-all` | `role_name`, `feature_key`, `access_level`, `can_view`, `can_create`, `can_edit`, `can_delete` | apply schema chain ก่อน | ย้าย permission preset ทั้งชุดตามที่ USER ยืนยัน |
| `checklist_procedure_plans` | `seed-all` | `plan_name`, `steps` | apply schema chain ก่อน | ควร seed ก่อน template mappings |
| `checklist_templates` | `seed-all` | `item_key`, `category`, `freq_type`, `item_label`, `instruction`, `ui_template_type`, `template_config`, `is_active`, `sort_order` | `master_data` (`checklist_category`) ควรพร้อมก่อน | ต้อง verify live schema ถ้ามี field ใหม่หลัง base migration |
| `checklist_targets` | `seed-all` | `target_code`, `target_type`, `name`, `location`, `qr_value`, `metadata`, `is_active` | `master_data` (`target_type`) ควรพร้อมก่อน | หลัง `20260521_remove_target_groups.sql` ต้องไม่มี `target_group_id` แล้ว |
| `checklist_template_targets` | `seed-all` | `template_id`, `target_id`, `target_type`, `is_active` | `checklist_templates`, `checklist_targets` | ต้อง seed หลัง parent tables เสมอ; `target_id = null` อนุญาตได้เมื่อ row นั้นเป็น valid `per_type` mapping และมี `target_type` |
| `checklist_template_procedure_plans` | `seed-all` | `template_id`, `plan_id`, `is_default`, `sort_order`, `is_active` | `checklist_templates`, `checklist_procedure_plans` | เป็น many-to-many mapping จาก migration `20260525_template_procedure_plan_many_to_many.sql` |
| `no_series` | `seed-all` | `code`, `description`, `is_active` | apply schema chain ก่อน | ต้อง verify ว่ามี field เสริมที่ helper ใช้งานจริงหรือไม่ เช่น `format`, `linked_form`, `last_no_used` |
| `no_series_lines` | `seed-all` | `series_code`, `starting_date`, `ending_date`, `format`, `last_no_used`, `increment_by`, `warning_no` | `no_series` | seed หลัง header table |
| `approval_substitutes` | `seed-all` | `primary_approver_id`, `substitute_id`, `is_active`, `start_date`, `end_date`, `reason` | schema chain ก่อน, selected users ต้องพร้อมก่อน | audit ล่าสุดยืนยันว่า dev schema ถูก align เป็น runtime columns แล้ว |
| `auth.users` | `seed-selected` | selected rows สำหรับ `admin@dowa-tht.co.th`, `natthawut@dowa-tht.co.th` | apply schema chain ก่อน | ให้สร้าง/restore เฉพาะ 2 account นี้ แล้วใช้ `id` ไปผูก `user_profiles` |
| `user_profiles` | `seed-selected` | `id`, `email`, `full_name`, `role`, `is_active`, `can_be_assignee`, `expires_at` | `auth.users` ต้องพร้อมก่อน | ห้ามย้าย `signature_pin`, OTP, onboarding, recovery, reset tokens |
| `user_whitelist` | `seed-selected` | `email_hash` | selected user emails ต้องถูกกำหนดแล้ว | ย้ายเฉพาะ hash ของ 2 email ที่อนุมัติ |

---

## Reset-Empty / Out-of-Scope Tables

| Table | Action | Note |
|---|---|---|
| `incidents` | `reset-empty` | ไม่ย้าย transaction data |
| `document_approvals` | `reset-empty` | ให้ production เริ่ม clean |
| `checklist_docs` | `reset-empty` | ไม่ย้ายเอกสารตรวจจริงจาก dev |
| `checklist_items` | `reset-empty` | เป็น transaction/result data |
| `incident_logs` | `reset-empty` | ไม่ย้ายประวัติย้อนหลัง |
| `incident_exclusions` | `reset-empty` | ผูกกับ transaction incident |
| `email_otps` | `reset-empty` | state ชั่วคราว |
| `system_audit_logs` | `reset-empty` | USER ต้องการ production clean |
| `admin_audit_logs` | `reset-empty` | USER ต้องการ production clean |
| `backup_logs` | `reset-empty` | USER ต้องการ production clean |
| `system_logs` | `reset-empty` | USER ต้องการ production clean |
| `login_logs` | `reset-empty` | USER ต้องการ production clean |

---

## Baseline Seed Order

1. Apply migration chain ทั้งหมดใน `supabase/migrations/`
2. Seed `system_settings`
3. Seed `master_data`
4. Seed `holidays`
5. Seed `permission_sets`
6. Seed `checklist_procedure_plans`
7. Seed `checklist_templates`
8. Seed `checklist_targets`
9. Seed `checklist_template_targets`
10. Seed `checklist_template_procedure_plans`
11. Create selected rows ใน `auth.users`
12. Upsert selected rows ใน `user_profiles`
13. Upsert selected rows ใน `user_whitelist`
14. Seed `workflow_configs`
15. Seed `approval_substitutes`
16. Seed `no_series`
17. Seed `no_series_lines`

---

## Selected User Carry-Forward Policy

### Keep
- `auth.users.email`
- `user_profiles.id`
- `user_profiles.email`
- `user_profiles.full_name`
- `user_profiles.role`
- `user_profiles.is_active`
- `user_profiles.can_be_assignee`
- `user_profiles.expires_at` เมื่อจำเป็นตาม role
- `user_whitelist.email_hash`

### Reset
- `user_profiles.signature_pin`
- `user_profiles.otp_code`
- `user_profiles.otp_expires_at`
- `user_profiles.otp_attempts`
- `user_profiles.is_onboarded`
- `user_profiles.onboarding_token`
- `user_profiles.onboarding_token_expires`
- `user_profiles.force_password_change`
- `user_profiles.recovery_otp`
- `user_profiles.recovery_otp_expires`
- `user_profiles.pin_reset_token`
- `user_profiles.pin_reset_expires`

---

## Must-Verify Before Execution Runbook

1. `workflow_configs` live schema มี `condition_key` หรือไม่
2. `checklist_targets` หลัง remove target groups ตรงกับโค้ดปัจจุบันหรือไม่
3. `checklist_templates` และ `checklist_procedure_plans` มี field เสริมจาก migration ภายหลังหรือไม่
4. `no_series` มี field เสริมที่ runtime helper ใช้จริงหรือไม่
5. `master_data.checklist_category` และ `master_data.target_type` ครอบคลุม runtime baseline values ที่อยู่ใน `checklist_templates` / `checklist_targets` / `checklist_template_targets` หรือไม่

---

## Related Documents

- `docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`
- `docs/manuals/PRODUCTION_MIGRATION_SOP.md`
- `docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md`
- `docs/standards/DEV_PROD_OPERATING_POLICY.md`
- `docs/standards/MIGRATION_COMMAND_CONTRACT.md`
