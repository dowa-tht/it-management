# Production Re-baseline Verification SQL Pack

เอกสารนี้รวม `SQL verification pack` สำหรับใช้หลัง schema apply และ import baseline เสร็จแล้ว

> [!IMPORTANT]
> SQL ชุดนี้ตั้งใจใช้กับ `production target after import`
> - Supabase project: `yrgsukhjkoexvdybyyjm`
>
> ห้ามใช้ผลลัพธ์ชุดนี้แทน execution log
> ต้องใช้ควบคู่กับ release inventory และ imported row counts เสมอ

---

## 1. Required Placeholders

- `<ADMIN_EMAIL>` = `admin@dowa-tht.co.th`
- `<NATTHAWUT_EMAIL>` = `natthawut@dowa-tht.co.th`
- `<ADMIN_EMAIL_HASH>` = hash ของ `admin@dowa-tht.co.th`
- `<NATTHAWUT_EMAIL_HASH>` = hash ของ `natthawut@dowa-tht.co.th`

---

## 2. Verification Order

1. schema presence
2. row counts
3. dependency/orphan checks
4. selected users
5. workflow/substitute references
6. RLS/policy sanity

---

## 3. Schema Presence Queries

## A1. Core target tables

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'system_settings',
    'master_data',
    'holidays',
    'permission_sets',
    'checklist_procedure_plans',
    'checklist_templates',
    'checklist_targets',
    'checklist_template_targets',
    'checklist_template_procedure_plans',
    'workflow_configs',
    'approval_substitutes',
    'no_series',
    'no_series_lines',
    'user_profiles',
    'user_whitelist'
  )
order by table_name;
```

## A2. `workflow_configs` verified columns

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'workflow_configs'
  and column_name in (
    'doc_type',
    'target_type',
    'condition_key',
    'condition_value',
    'step_order',
    'role_required',
    'approver_id',
    'is_active'
  )
order by column_name;
```

## A3. `approval_substitutes` verified columns

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'approval_substitutes'
  and column_name in (
    'primary_approver_id',
    'substitute_id',
    'is_active',
    'start_date',
    'end_date',
    'reason'
  )
order by column_name;
```

## A4. `checklist_targets` no legacy target-group column

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'checklist_template_targets'
  and column_name = 'target_group_id';
```

Expected:
- `0 rows`

---

## 4. Row-count Verification Pack

```sql
select 'system_settings' as table_name, count(*) as row_count
from public.system_settings
where key in (
  'working_hours',
  'sla_limits',
  'working_hours_guide_content',
  'holidays_guide_content',
  'workflow_guide_content',
  'permissions_guide_content',
  'no_series_guide_content',
  'substitutes_guide_content',
  'incident_category_guide_content',
  'affected_system_guide_content',
  'sla_exclusion_reason_guide_content',
  'checklist_category_guide_content',
  'target_type_guide_content'
)
union all
select 'master_data', count(*) from public.master_data
where type in ('incident_category','affected_system','sla_exclusion_reason','checklist_category','target_type')
union all
select 'holidays', count(*) from public.holidays
union all
select 'permission_sets', count(*) from public.permission_sets
union all
select 'checklist_procedure_plans', count(*) from public.checklist_procedure_plans
union all
select 'checklist_templates', count(*) from public.checklist_templates
union all
select 'checklist_targets', count(*) from public.checklist_targets
union all
select 'checklist_template_targets', count(*) from public.checklist_template_targets
union all
select 'checklist_template_procedure_plans', count(*) from public.checklist_template_procedure_plans
union all
select 'auth.users', count(*) from auth.users
where email in ('<ADMIN_EMAIL>', '<NATTHAWUT_EMAIL>')
union all
select 'user_profiles', count(*) from public.user_profiles
where email in ('<ADMIN_EMAIL>', '<NATTHAWUT_EMAIL>')
union all
select 'user_whitelist', count(*) from public.user_whitelist
where email_hash in ('<ADMIN_EMAIL_HASH>', '<NATTHAWUT_EMAIL_HASH>')
union all
select 'workflow_configs', count(*) from public.workflow_configs
union all
select 'approval_substitutes', count(*) from public.approval_substitutes
union all
select 'no_series', count(*) from public.no_series
union all
select 'no_series_lines', count(*) from public.no_series_lines
order by table_name;
```

---

## 5. Dependency / Orphan Checks

## B1. `checklist_template_targets`

```sql
select count(*) as orphan_template_target_rows
from public.checklist_template_targets m
left join public.checklist_templates t on t.id = m.template_id
left join public.checklist_targets ct on ct.id = m.target_id
where t.id is null
   or ct.id is null;
```

## B2. `checklist_template_procedure_plans`

```sql
select count(*) as orphan_template_plan_rows
from public.checklist_template_procedure_plans m
left join public.checklist_templates t on t.id = m.template_id
left join public.checklist_procedure_plans p on p.id = m.plan_id
where t.id is null
   or p.id is null;
```

## B3. `no_series_lines`

```sql
select count(*) as orphan_no_series_line_rows
from public.no_series_lines l
left join public.no_series s on s.code = l.series_code
where s.code is null;
```

Expected for all 3 queries:
- `0`

---

## 6. Selected User Verification Queries

## C1. `auth.users`

```sql
select id, email, email_confirmed_at
from auth.users
where email in ('<ADMIN_EMAIL>', '<NATTHAWUT_EMAIL>')
order by email;
```

## C2. `user_profiles`

```sql
select id, email, full_name, role, is_active, can_be_assignee, expires_at
from public.user_profiles
where email in ('<ADMIN_EMAIL>', '<NATTHAWUT_EMAIL>')
order by email;
```

## C3. `user_whitelist`

```sql
select email_hash
from public.user_whitelist
where email_hash in ('<ADMIN_EMAIL_HASH>', '<NATTHAWUT_EMAIL_HASH>')
order by email_hash;
```

Pass criteria:
- ได้ครบ 2 rows ในแต่ละ logical group

---

## 7. Workflow / Substitute Reference Checks

## D1. external approver refs in `workflow_configs`

```sql
select count(*) as workflow_rows_with_external_approver_refs
from public.workflow_configs wc
where wc.approver_id is not null
  and not exists (
    select 1
    from public.user_profiles up
    where up.id = wc.approver_id
      and up.email in ('<ADMIN_EMAIL>', '<NATTHAWUT_EMAIL>')
  );
```

## D2. external refs in `approval_substitutes`

```sql
select count(*) as substitute_rows_with_external_refs
from public.approval_substitutes s
where not exists (
    select 1 from public.user_profiles up
    where up.id = s.primary_approver_id
      and up.email in ('<ADMIN_EMAIL>', '<NATTHAWUT_EMAIL>')
  )
  or not exists (
    select 1 from public.user_profiles up
    where up.id = s.substitute_id
      and up.email in ('<ADMIN_EMAIL>', '<NATTHAWUT_EMAIL>')
  );
```

Expected:
- both = `0`

---

## 8. RLS / Policy Sanity Pack

## E1. RLS enabled state

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('working_hours','sla_exclusions','sla_holidays','approval_substitutes')
order by c.relname;
```

Expected:
- `rls_enabled = true` ทุกตาราง

## E2. policy inventory

```sql
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('working_hours','sla_exclusions','sla_holidays','approval_substitutes')
order by tablename, policyname;
```

Expected:
- `approval_substitutes` มี 5 policies ตาม remediation plan
- `working_hours`, `sla_exclusions`, `sla_holidays` มี `admin_all_*`

---

## 9. Optional Sanity Queries

## F1. duplicate holiday dates

```sql
select holiday_date, count(*)
from public.holidays
group by holiday_date
having count(*) > 1;
```

## F2. duplicate permission pairs

```sql
select role_name, feature_key, count(*)
from public.permission_sets
group by role_name, feature_key
having count(*) > 1;
```

Expected:
- both = `0 rows`

---

## 10. Result Recording Template

ใช้คู่กับ verification runbook:

| Query Pack | Expected | Actual | Status | Note |
|---|---|---|---|---|
| `A1` | all target tables present | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |

---

## 11. Related Documents

- [PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md:1)
- [PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md:1)
- [PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md:1)
