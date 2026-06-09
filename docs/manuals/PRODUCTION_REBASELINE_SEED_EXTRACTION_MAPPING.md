# Production Re-baseline Seed Extraction Mapping

เอกสารนี้ระบุวิธี extract / transform / import สำหรับแต่ละตารางที่อยู่ใน scope ของ `Production Re-baseline Migration` เพื่อใช้ประกอบ [PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md:1)

> [!IMPORTANT]
> เอกสารนี้เป็นแผน extraction/import เท่านั้น  
> ยังไม่ใช่คำสั่ง execute จริง และยังห้ามแตะ production จนกว่าจะเข้าสู่ `Production Migration Mode`

---

## 1. Method Legend

| Method | ความหมาย |
|---|---|
| `export-filtered-json` | export ข้อมูลแบบกรองเฉพาะ rows/fields ที่อยู่ใน scope แล้วเก็บเป็น JSON artifact |
| `export-ordered-json` | export แบบมีลำดับ parent-child ชัดเจน |
| `transform-before-import` | ต้องแปลง shape หรือ field ก่อน import |
| `create-then-upsert` | ต้องสร้าง entity ต้นทางก่อน แล้วค่อย upsert ตารางตาม |
| `manual-review-required` | ห้าม import อัตโนมัติจนกว่าจะมีคนตรวจ |

---

## 2. Baseline Config Group

| Table | Export Method | Import Method | Transform | Validation |
|---|---|---|---|---|
| `system_settings` | `export-filtered-json` | upsert by `key` | filter เฉพาะ approved baseline keys | ตรวจว่าทุก key อยู่ใน approved list |
| `master_data` | `export-filtered-json` + supplement pack เมื่อ source ยังขาดบาง values | insert/upsert by logical uniqueness | filter เฉพาะ approved `type` values แต่ต้องรวม runtime-referenced `checklist_category` และ `target_type` ที่ baseline ใช้อยู่จริง | ตรวจว่าไม่มี baseline template/target/mapping อ้างค่าที่อยู่นอก exported master data หรือ supplement pack |
| `holidays` | `export-filtered-json` | insert/upsert by date | ไม่มี transform พิเศษ | ตรวจ duplicate `holiday_date` |
| `permission_sets` | `export-filtered-json` | upsert by `(role_name, feature_key)` | normalize `access_level` ถ้าจำเป็น | ตรวจ unique pair และ permission completeness |

---

## 3. Checklist Baseline Group

| Table | Export Method | Import Method | Transform | Validation |
|---|---|---|---|---|
| `checklist_procedure_plans` | `export-ordered-json` | insert then map ids | อาจต้อง normalize fields ถ้ามี drift | ตรวจว่า `steps` parse ได้ |
| `checklist_templates` | `export-ordered-json` | insert then map ids | ตรวจ `template_config` และ category references | ตรวจว่า `category` อยู่ใน exported `master_data` |
| `checklist_targets` | `export-ordered-json` | insert then map ids | remove legacy fields ที่ไม่อยู่ใน live schema | ตรวจว่า `target_type` อยู่ใน exported `master_data` |
| `checklist_template_targets` | `export-ordered-json` | import หลัง parent ids พร้อม | remap `template_id`, `target_id` และ carry `target_type` สำหรับ `per_type` rows | row แบบ `target_id = null` ให้ถือว่าถูกต้องเมื่อ `target_type` มีค่าและ parent template อยู่จริง |
| `checklist_template_procedure_plans` | `export-ordered-json` | import หลัง parent ids พร้อม | remap `template_id`, `plan_id` | ตรวจ orphan mappings และ default uniqueness |

---

## 4. Workflow Baseline Group

| Table | Export Method | Import Method | Transform | Validation |
|---|---|---|---|---|
| `workflow_configs` | `export-filtered-json` | upsert/import หลัง selected users พร้อม | remap `approver_id` ถ้า auth ids เปลี่ยน | ตรวจ approver references ทุก row |
| `approval_substitutes` | `export-filtered-json` | import หลัง selected users พร้อม | remap `primary_approver_id` และ `substitute_id` ถ้า auth ids เปลี่ยน | ตรวจ substitute references ทุก row |

---

## 5. Number Series Group

| Table | Export Method | Import Method | Transform | Validation |
|---|---|---|---|---|
| `no_series` | `export-filtered-json` | insert/upsert by `code` | ต้อง confirm runtime fields ก่อน | ตรวจ `code` uniqueness |
| `no_series_lines` | `export-ordered-json` | import หลัง `no_series` | map by `series_code` | ตรวจ `(series_code, starting_date)` uniqueness |

---

## 6. Selected User Group

| Table | Export Method | Import Method | Transform | Validation |
|---|---|---|---|---|
| `auth.users` | `export-filtered-json` เฉพาะ metadata ที่จำเป็น หรือใช้ create plan แทน | `create-then-upsert` | ปกติให้สร้างใหม่ใน prod แล้วใช้ new ids | ตรวจว่า 2 emails ถูกสร้างครบ |
| `user_profiles` | `export-filtered-json` | upsert by `id` หลัง create auth users | reset sensitive state และ remap `id` ให้ตรง auth user ใหม่ | ตรวจว่า role/email/id ตรง |
| `user_whitelist` | `export-filtered-json` | upsert by `email_hash` | ไม่มี transform หาก hash policy เดิม | ตรวจว่ามีเฉพาะ 2 hashes |

---

## 7. Sensitive Field Reset Policy

สำหรับ `user_profiles` ห้าม carry forward fields เหล่านี้:

- `signature_pin`
- `otp_code`
- `otp_expires_at`
- `otp_attempts`
- `is_onboarded`
- `onboarding_token`
- `onboarding_token_expires`
- `force_password_change`
- `recovery_otp`
- `recovery_otp_expires`
- `pin_reset_token`
- `pin_reset_expires`

แนวทาง:
- export ได้เพื่อ audit/check เท่านั้นถ้าจำเป็น
- แต่ห้าม import กลับขึ้น production

---

## 8. Parent-Child Import Order

ใช้ลำดับนี้ทุกครั้ง:

1. `system_settings`
2. `master_data`
3. `holidays`
4. `permission_sets`
5. `checklist_procedure_plans`
6. `checklist_templates`
7. `checklist_targets`
8. `checklist_template_targets`
9. `checklist_template_procedure_plans`
10. `auth.users`
11. `user_profiles`
12. `user_whitelist`
13. `workflow_configs`
14. `approval_substitutes`
15. `no_series`
16. `no_series_lines`

---

## 9. Artifact Layout Recommendation

แนะนำให้ export เก็บเป็น artifact แยกกลุ่ม:

1. `baseline-config`
   - `system_settings`
   - `master_data`
   - `holidays`
   - `permission_sets`
2. `baseline-checklist`
   - `checklist_procedure_plans`
   - `checklist_templates`
   - `checklist_targets`
   - `checklist_template_targets`
   - `checklist_template_procedure_plans`
3. `baseline-workflow`
   - `workflow_configs`
   - `approval_substitutes`
4. `baseline-number-series`
   - `no_series`
   - `no_series_lines`
5. `selected-users`
   - `auth.users`
   - `user_profiles`
   - `user_whitelist`

---

## 10. Import Acceptance Rules

ถือว่านำเข้าผ่านได้เมื่อ:

1. ทุกตารางผ่าน row-count sanity check
2. ไม่มี invalid mappings (`target_id` และ `target_type` ว่างพร้อมกัน, หรือ parent rows หาย)
3. selected users login ได้
4. settings pages load ได้
5. workflow/permissions/no-series ใช้งานได้ตาม expected baseline

---

## Related Documents

- `docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md`
- `docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md`
- `docs/manuals/PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md`
