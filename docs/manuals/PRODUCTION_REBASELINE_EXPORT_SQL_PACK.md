# Production Re-baseline Export SQL Pack

เอกสารนี้รวม `SQL export queries` แบบ table-by-table สำหรับเตรียม baseline artifacts จาก `dev Supabase`

> [!IMPORTANT]
> ใช้ SQL ชุดนี้กับ `development source database` เท่านั้น:
> - Supabase project: `fhcsvvlwhwqzlsltrkuq`
>
> ห้ามรันกับ production target `yrgsukhjkoexvdybyyjm`

---

## 1. Required Placeholders

ก่อนรันให้แทนค่าต่อไปนี้:

- `<ADMIN_EMAIL>` = `admin@dowa-tht.co.th`
- `<NATTHAWUT_EMAIL>` = `natthawut@dowa-tht.co.th`
- `<ADMIN_EMAIL_HASH>` = hash ของ `admin@dowa-tht.co.th`
- `<NATTHAWUT_EMAIL_HASH>` = hash ของ `natthawut@dowa-tht.co.th`

---

## 2. Export Order

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

## 3. Baseline Config Queries

## A1. `system_settings`

```sql
select key, value
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
order by key;
```

## A2. `master_data`

```sql
select type, value, sort_order, is_active
from public.master_data
where type in (
  'incident_category',
  'affected_system',
  'sla_exclusion_reason',
  'checklist_category',
  'target_type'
)
order by type, sort_order nulls last, value;
```

## A3. `holidays`

```sql
select holiday_date, description
from public.holidays
order by holiday_date;
```

## A4. `permission_sets`

```sql
select role_name, feature_key, access_level, can_view, can_create, can_edit, can_delete
from public.permission_sets
order by role_name, feature_key;
```

---

## 4. Checklist Baseline Queries

## B1. `checklist_procedure_plans`

```sql
select *
from public.checklist_procedure_plans
order by plan_name, id;
```

## B2. `checklist_templates`

```sql
select *
from public.checklist_templates
order by category, sort_order nulls last, item_key, id;
```

## B3. `checklist_targets`

```sql
select target_code, target_type, name, location, qr_value, metadata, is_active
from public.checklist_targets
order by target_type, target_code, name;
```

## B4. `checklist_template_targets`

```sql
select template_id, target_id, target_type, is_active
from public.checklist_template_targets
order by template_id, target_type, target_id;
```

## B5. `checklist_template_procedure_plans`

```sql
select template_id, plan_id, is_default, sort_order, is_active
from public.checklist_template_procedure_plans
order by template_id, sort_order nulls last, plan_id;
```

---

## 5. Selected User Queries

## C1. `auth.users`

```sql
select id, email, created_at, updated_at, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data
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

---

## 6. Workflow Baseline Queries

## D1. `workflow_configs`

```sql
select doc_type, target_type, condition_key, condition_value, step_order, role_required, approver_id, is_active
from public.workflow_configs
order by doc_type, target_type, step_order, role_required;
```

## D2. `approval_substitutes`

```sql
select primary_approver_id, substitute_id, is_active, start_date, end_date, reason
from public.approval_substitutes
order by primary_approver_id, substitute_id, start_date nulls last, end_date nulls last;
```

---

## 7. Number Series Queries

## E1. `no_series`

```sql
select *
from public.no_series
order by code;
```

## E2. `no_series_lines`

```sql
select series_code, starting_date, ending_date, format, last_no_used, increment_by, warning_no
from public.no_series_lines
order by series_code, starting_date;
```

---

## 8. Export Row Count Pack

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

## 9. Pre-export Integrity Queries

## F1. `workflow_configs` external approver reference check

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

## F2. `approval_substitutes` external user reference check

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

## F3. `checklist_template_targets` orphan check

```sql
select count(*) as orphan_template_target_rows
from public.checklist_template_targets m
left join public.checklist_templates t on t.id = m.template_id
left join public.checklist_targets ct on ct.id = m.target_id
where t.id is null
   or ct.id is null;
```

## F4. `checklist_template_procedure_plans` orphan check

```sql
select count(*) as orphan_template_plan_rows
from public.checklist_template_procedure_plans m
left join public.checklist_templates t on t.id = m.template_id
left join public.checklist_procedure_plans p on p.id = m.plan_id
where t.id is null
   or p.id is null;
```

## F5. `no_series_lines` orphan check

```sql
select count(*) as orphan_no_series_line_rows
from public.no_series_lines l
left join public.no_series s on s.code = l.series_code
where s.code is null;
```

---

## 10. Related Documents

- [PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md:1)
- [PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md:1)
- [PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md:1)
