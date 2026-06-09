# Production Re-baseline RLS Remediation Plan

เอกสารนี้ใช้สรุปแผน remediation สำหรับ security follow-up ที่พบจาก `Schema Verification Checklist` รอบ `08-Jun-2026`

---

## Objective

ปิดช่องโหว่ `RLS disabled` บน 4 ตารางที่ Supabase advisory แจ้ง โดยแยกแนวทางตามลักษณะการใช้งานจริงของแต่ละตาราง:

1. `approval_substitutes` เป็น runtime table ที่โค้ดใช้งานจริง
2. `working_hours`, `sla_exclusions`, `sla_holidays` เป็น legacy public tables ที่ live schema ยังมีอยู่ แต่ runtime ปัจจุบันไม่ได้ใช้งานเป็น source of truth แล้ว

---

## Scope

ตารางใน scope:

- `public.working_hours`
- `public.sla_exclusions`
- `public.sla_holidays`
- `public.approval_substitutes`

---

## Evidence Snapshot

### Active runtime table

- `approval_substitutes`
  - ใช้ในหน้า personal settings ที่ [app/dashboard/settings/substitutes/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/substitutes/page.js:70)
  - ใช้ใน workflow notification/runtime substitute resolution ที่ [app/actions/workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:565) และ [lib/workflow.js](/C:/Users/Lenovo/dowa-it-system/lib/workflow.js:100)

### Legacy / duplicate tables

- `working_hours`
  - runtime ปัจจุบันอ่านจาก `system_settings.key = 'working_hours'` ที่ [app/dashboard/settings/working-hours/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/working-hours/page.js:201), [app/actions/dashboard.js](/C:/Users/Lenovo/dowa-it-system/app/actions/dashboard.js:60), [app/actions/reports.js](/C:/Users/Lenovo/dowa-it-system/app/actions/reports.js:43)
- `sla_exclusions`
  - runtime ปัจจุบันใช้ `incident_exclusions` สำหรับ SLA pause windows ที่ [app/actions/workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:146), [app/actions/reports.js](/C:/Users/Lenovo/dowa-it-system/app/actions/reports.js:44)
- `sla_holidays`
  - runtime ปัจจุบันใช้ `holidays` ที่ [app/actions/reports.js](/C:/Users/Lenovo/dowa-it-system/app/actions/reports.js:42) และ [app/dashboard/settings/holidays/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/holidays/page.js:253)

### Live state at audit time

- `working_hours`: `0 rows`
- `sla_exclusions`: `0 rows`
- `sla_holidays`: `0 rows`
- `approval_substitutes`: `0 rows`

อ้างอิงผล audit ล่าสุดที่ [AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md](/C:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md:78)

---

## Remediation Strategy

| Table | Runtime Status | RLS Strategy | Reason |
|---|---|---|---|
| `approval_substitutes` | active | enable RLS + owner/substitute/admin policies | เป็นตารางใช้งานจริงจาก client และ workflow logic |
| `working_hours` | legacy | enable RLS + admin-only lockdown | source of truth ปัจจุบันคือ `system_settings` ไม่ใช่ table นี้ |
| `sla_exclusions` | legacy | enable RLS + admin-only lockdown | source of truth ปัจจุบันคือ `incident_exclusions` |
| `sla_holidays` | legacy | enable RLS + admin-only lockdown | source of truth ปัจจุบันคือ `holidays` |

---

## Policy Contract

## 1. `approval_substitutes`

### Read

- `admin` อ่านได้ทุก row
- เจ้าของ row (`primary_approver_id = auth.uid()`) อ่านได้
- ผู้ถูกตั้งเป็นคนแทน (`substitute_id = auth.uid()`) อ่านได้

### Insert

- `admin` insert ได้
- ผู้ใช้ทั่วไป insert ได้เฉพาะ row ที่ `primary_approver_id = auth.uid()`

### Update

- `admin` update ได้ทุก row
- เจ้าของ row update ได้เฉพาะ row ของตัวเอง
- `substitute` ห้าม update row ของคนอื่น

### Delete

- `admin` delete ได้ทุก row
- เจ้าของ row delete row ของตัวเองได้

### Why this contract

- หน้า `My Absence / Substitution` อ่านและเขียนเฉพาะ substitute windows ของตัวเอง
- helper `isSubstituteOf()` ต้องเปิด read ให้ substitute อ่าน row ที่ตัวเองถูกอ้างอิงอยู่ ไม่เช่นนั้น workflow client-side checks จะพัง
- ไม่ควรเปิด read ทั้งตารางให้ authenticated ทั้งหมด เพราะเป็นข้อมูล delegation ด้าน approval

---

## 2. `working_hours`

### Read / Write

- `admin` เท่านั้น
- role อื่นทั้งหมดไม่ควรแตะ table นี้

### Why this contract

- โค้ด production-path ปัจจุบันใช้ `system_settings.key = 'working_hours'`
- table นี้มีลักษณะเป็น schema เก่าและปัจจุบันไม่มี rows
- เปิด read/write ให้ role อื่นไม่มีประโยชน์เชิง runtime และเพิ่ม attack surface โดยไม่จำเป็น

---

## 3. `sla_exclusions`

### Read / Write

- `admin` เท่านั้น
- role อื่นทั้งหมดไม่ควรแตะ table นี้

### Why this contract

- runtime ปัจจุบันใช้ `incident_exclusions`
- table นี้เป็น legacy duplicate และปัจจุบันไม่มี rows
- การเปิด access ให้ wider roles เสี่ยงทำให้เกิด data confusion ระหว่าง `incident_exclusions` กับ `sla_exclusions`

---

## 4. `sla_holidays`

### Read / Write

- `admin` เท่านั้น
- role อื่นทั้งหมดไม่ควรแตะ table นี้

### Why this contract

- runtime ปัจจุบันใช้ `holidays`
- table นี้เป็น legacy duplicate และปัจจุบันไม่มี rows
- การเปิด read ให้ทุก role ซ้ำกับ `holidays` ไม่มีประโยชน์ และอาจทำให้เกิด split source of truth ในอนาคต

---

## Implementation Artifact

ให้ใช้ migration:

- [20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql:1)

artifact นี้มีหน้าที่:

1. `ENABLE ROW LEVEL SECURITY` บน 4 ตาราง
2. วาง policy สำหรับ `approval_substitutes`
3. วาง `admin-only lockdown` สำหรับ 3 legacy tables

---

## Verification Checklist After Apply

1. `approval_substitutes`
- owner อ่าน row ของตัวเองได้
- substitute อ่าน row ที่ตัวเองถูกอ้างถึงได้
- user อื่นที่ไม่เกี่ยวข้องอ่านไม่ได้
- owner update/delete row ของตัวเองได้

2. `working_hours`
- authenticated non-admin ต้อง `select/insert/update/delete` ไม่ได้
- admin ยังเข้าถึงได้

3. `sla_exclusions`
- authenticated non-admin ต้องเข้าถึงไม่ได้
- admin ยังเข้าถึงได้

4. `sla_holidays`
- authenticated non-admin ต้องเข้าถึงไม่ได้
- admin ยังเข้าถึงได้

---

## Manual Dev Apply Note

ณ วันที่ `09-Jun-2026` การ apply migration ผ่าน Supabase MCP connector ยังถูกบล็อกด้วยข้อความ `Cannot apply migration in read-only mode.`

ดังนั้นหากจะทำต่อบน `dev Supabase` ให้ใช้วิธี manual ใน `SQL Editor` โดยรันไฟล์:

- [20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql:1)

### Quick Verification Query

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('working_hours','sla_exclusions','sla_holidays','approval_substitutes')
order by c.relname;
```

คาดหวังผล:

- `rls_enabled = true` ทุกตาราง

### Policy Verification Query

```sql
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('working_hours','sla_exclusions','sla_holidays','approval_substitutes')
order by tablename, policyname;
```

คาดหวังผล:

- `working_hours`, `sla_exclusions`, `sla_holidays` มี policy `admin_all_*`
- `approval_substitutes` มี:
  - `admin_all_approval_substitutes`
  - `authenticated_select_own_or_substitute_approval_substitutes`
  - `authenticated_insert_own_approval_substitutes`
  - `authenticated_update_own_approval_substitutes`
  - `authenticated_delete_own_approval_substitutes`

---

## Follow-up Recommendation

หลัง production re-baseline ครั้งแรกเสร็จ ควรตัดสินใจต่อว่า 3 legacy tables นี้จะ:

1. `retain as admin-locked legacy tables`
2. หรือ `drop in a later cleanup migration`

สำหรับรอบนี้ แนะนำให้ใช้แนวทาง `lock first, drop later` เพื่อไม่ขยาย scope ของ migration ครั้งแรกเกินจำเป็น
