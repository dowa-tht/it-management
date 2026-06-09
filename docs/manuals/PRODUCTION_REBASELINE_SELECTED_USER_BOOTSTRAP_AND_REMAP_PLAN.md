# Production Re-baseline Selected User Bootstrap and Remap Plan

เอกสารนี้ใช้กำหนด flow สำหรับ `selected user bootstrap` และ `reference remap` ใน first production re-baseline

> [!IMPORTANT]
> ใช้เฉพาะกับ selected users 2 รายการนี้:
> - `admin@dowa-tht.co.th`
> - `natthawut@dowa-tht.co.th`

---

## 1. Objective

ทำ 3 เรื่องให้ครบก่อน import workflow baseline:

1. สร้าง `auth.users` บน production
2. upsert `user_profiles` และ `user_whitelist`
3. remap references ใน:
   - `workflow_configs.approver_id`
   - `approval_substitutes.primary_approver_id`
   - `approval_substitutes.substitute_id`

---

## 2. Fixed Source / Target

### Source
- Dev Supabase: `fhcsvvlwhwqzlsltrkuq`

### Target
- Prod Supabase: `yrgsukhjkoexvdybyyjm`

---

## 3. Selected Users Contract

| Email | Role | is_active | can_be_assignee | Carry forward |
|---|---|---|---|---|
| `admin@dowa-tht.co.th` | `admin` | `true` | `false` | yes |
| `natthawut@dowa-tht.co.th` | `it_staff` | `true` | `true` | yes |

Sensitive state that must reset:
- `signature_pin`
- `otp_*`
- `is_onboarded`
- `onboarding_*`
- `force_password_change`
- `recovery_*`
- `pin_reset_*`

---

## 4. Bootstrap Order

1. export source users from dev
2. create `auth.users` on prod
3. capture new `auth.users.id`
4. build `user_id_mapping_plan`
5. upsert `user_profiles`
6. upsert `user_whitelist`
7. remap workflow/substitute artifacts
8. verify references

---

## 5. User ID Mapping Worksheet

| Email | Source User ID | Target User ID | Role | Notes |
|---|---|---|---|---|
| `admin@dowa-tht.co.th` | `<fill-me>` | `<fill-me>` | `admin` | `<fill-me>` |
| `natthawut@dowa-tht.co.th` | `<fill-me>` | `<fill-me>` | `it_staff` | `<fill-me>` |

---

## 6. Remap Rules

## A. `workflow_configs`

Rule:
- ถ้า `approver_id` = source admin id -> replace with target admin id
- ถ้า `approver_id` = source natthawut id -> replace with target natthawut id
- ถ้า `approver_id` เป็น `null` -> keep `null`
- ถ้าเจอ id อื่น -> stop migration

## B. `approval_substitutes`

Rule:
- remap `primary_approver_id` ด้วย `user_id_mapping_plan`
- remap `substitute_id` ด้วย `user_id_mapping_plan`
- ถ้าเจอ id อื่นนอก 2 users -> stop migration

---

## 7. Verification Queries After Remap

## A. `workflow_configs`

```sql
select count(*) as workflow_rows_with_external_approver_refs
from public.workflow_configs wc
where wc.approver_id is not null
  and not exists (
    select 1
    from public.user_profiles up
    where up.id = wc.approver_id
      and up.email in ('admin@dowa-tht.co.th', 'natthawut@dowa-tht.co.th')
  );
```

Expected:
- `0`

## B. `approval_substitutes`

```sql
select count(*) as substitute_rows_with_external_refs
from public.approval_substitutes s
where not exists (
    select 1 from public.user_profiles up
    where up.id = s.primary_approver_id
      and up.email in ('admin@dowa-tht.co.th', 'natthawut@dowa-tht.co.th')
  )
  or not exists (
    select 1 from public.user_profiles up
    where up.id = s.substitute_id
      and up.email in ('admin@dowa-tht.co.th', 'natthawut@dowa-tht.co.th')
  );
```

Expected:
- `0`

---

## 8. Stop Conditions

หยุดทันทีเมื่อ:

1. selected users ถูกสร้างไม่ครบ 2 ราย
2. target user ids ไม่ถูกบันทึกครบ
3. `user_profiles` upsert ไม่ครบ
4. `user_whitelist` upsert ไม่ครบ
5. workflow/substitute remap มี external id ค้าง

---

## 9. Related Documents

- [PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md:1)
- [PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md:1)
- [PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md:1)
