# 🚀 Production Migration Playbook

เอกสารนี้เป็นคู่มือมาตรฐานสำหรับการย้ายระบบจาก Development Repository `trush000/dowa-it-system` ไปยัง Production Repository `dowa-tht/it-management` พร้อมการย้าย deployment บน Vercel และโครงสร้างฐานข้อมูลบน Supabase

---

## 1) Scope และหลักการ

### In Scope
- Source Code (GitHub)
- Deployment Config (Vercel)
- Database **Structure/Config** (Supabase)
- Seed Data ที่จำเป็นต่อการใช้งานระบบ (เช่น วันหยุด, permission ขั้นต่ำ)

### Out of Scope (ค่าเริ่มต้น)
- ไม่ย้ายข้อมูลธุรกรรม production เดิม (incidents/checklist history)
- ไม่ย้ายข้อมูล test ที่ไม่จำเป็น

### Mandatory Rules
- ใช้ migration file เป็น source of truth เสมอ
- ห้ามแก้ schema production แบบ ad-hoc โดยไม่บันทึก migration
- ต้องมี rollback plan ก่อนเริ่มทุกครั้ง

---

## 2) Repositories และ Environments

- **Dev Source**: `trush000/dowa-it-system`
- **Prod Target**: `dowa-tht/it-management`
- **Vercel Project**: ผูกกับ repo ปลายทางด้านบน
- **Supabase Project (Prod)**: `yrgsukhjkoexvdybyyjm`

---

## 3) One-Time Bootstrap ที่ทำไปแล้ว

### Database Bootstrap Files
- [`supabase/migrations/20260505_base_schema_bootstrap.sql`](supabase/migrations/20260505_base_schema_bootstrap.sql)
- [`supabase/migrations/20260519_fill_missing_tables.sql`](supabase/migrations/20260519_fill_missing_tables.sql)

### Seed Holiday File
- [`scripts/seed_holidays_from_backup_2026.sql`](scripts/seed_holidays_from_backup_2026.sql)

---

## 4) Standard Migration Flow (ใช้ทุกครั้งที่อัปเดตเวอร์ชันจริง)

### Step A — Pre-Flight
1. Freeze deployment window
2. สร้าง Git tag ก่อนเริ่ม เช่น `pre-prod-YYYYMMDD-HHMM`
3. Backup schema snapshot + data snapshot
4. ยืนยัน `.env` ของ Vercel/Supabase ครบ

### Step B — Code Sync
1. Merge code ที่ผ่าน review ลง branch หลัก
2. Push ขึ้น [`dowa-tht/it-management`](https://github.com/dowa-tht/it-management)
3. ตรวจ Vercel deployment status ต้องผ่าน

### Step C — DB Structure Migration
1. รัน migration ที่เพิ่มใหม่ในลำดับเวลา
2. ถ้าระบบใหม่/empty ให้รัน bootstrap ก่อน
3. Verify ตารางหลัก, columns, indexes, policies

### Step D — Essential Seed
1. Seed ข้อมูล setup ขั้นต่ำ (permission/master data/holiday)
2. Verify ว่าเมนูใช้งานได้จริงจาก role `admin`

### Step E — Smoke/E2E Verification
ขั้นต่ำต้องผ่าน:
1. Login + Dashboard
2. Setup/Holidays
3. Checklist basic flow
4. Incident basic flow
5. Approvals view
6. Reports/SLA page load

### Step F — Release / Rollback Decision
1. ถ้าทุก check ผ่าน: promote production
2. ถ้าพบ critical issue: rollback ตามแผนทันที

---

## 5) Checkpoint Strategy (Test ↔ Prod)

### DB Checkpoint
- เทียบรายการ tables/columns ก่อนและหลัง migrate
- เทียบ RLS policies และ functions ที่เกี่ยวข้อง workflow
- บันทึก diff report ทุกครั้ง

### Code Checkpoint
- บังคับใช้ Git tag ก่อน deploy ทุกครั้ง
- เก็บ mapping: release tag ↔ migration files ↔ vercel deploy id

---

## 6) DB Diff Checklist

> วัตถุประสงค์: ยืนยันว่า production schema/policy/function ตรงกับ migration ที่ commit จริง โดยไม่ทำ ad-hoc change และไม่ละเมิด RLS/RBAC

### Critical (must-pass before production)

1. **Migration chain ครบและเรียงลำดับถูกต้อง**
   - Verify: migration ที่จะขึ้น production มีอยู่ใน [`supabase/migrations/`](supabase/migrations/) ครบทุกไฟล์ และเรียงตาม timestamp
   - Pass: ไม่มีไฟล์ตกหล่น/ข้ามลำดับ
   - Fail: พบ migration ที่รันบน DB แต่ไม่มีไฟล์ใน repo หรือมีไฟล์ใน repo ที่ยังไม่ถูก apply

2. **No unauthorized schema changes**
   - Verify SQL:
     ```sql
     -- ตรวจตารางหลักตามที่ระบบใช้งานจริง
     select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name in (
         'incidents',
         'document_approvals',
         'checklist_sessions',
         'checklist_items',
         'checklist_templates',
         'workflow_configs',
         'user_profiles',
         'user_whitelist'
       )
     order by table_name;
     ```
   - Pass: ตารางสำคัญครบ และไม่มีตาราง/คอลัมน์แปลกที่ไม่ได้อยู่ใน migration plan
   - Fail: พบ schema drift ที่ไม่ได้รับอนุมัติ

3. **RLS เปิดใช้งานและ policy ไม่หาย**
   - Verify SQL:
     ```sql
     -- ตรวจว่า RLS เปิดบนตารางสำคัญ
     select tablename, rowsecurity
     from pg_tables
     where schemaname = 'public'
       and tablename in ('incidents', 'document_approvals', 'checklist_sessions', 'checklist_items', 'checklist_templates');

     -- ตรวจ policy
     select tablename, policyname, permissive, roles, cmd
     from pg_policies
     where schemaname = 'public'
       and tablename in ('incidents', 'document_approvals', 'checklist_sessions', 'checklist_items', 'checklist_templates')
     order by tablename, policyname;
     ```
   - Pass: ทุกตารางที่ต้องคุมสิทธิ์มี RLS + policy ครบ
   - Fail: RLS ปิดหรือ policy สำคัญหาย

4. **RBAC contract ไม่เปลี่ยนโดยพลการ**
   - Verify: role หลัก `admin`, `it_staff`, `approver`, `employee`, `auditor` ยังทำงานตามมาตรฐาน และไม่มี migration ที่ลดสิทธิ์/ยกระดับสิทธิ์นอกแผน
   - Pass: ไม่มี role/permission drift
   - Fail: พบการแก้สิทธิ์นอกขอบเขตที่อนุมัติ

### Warning (should-fix / documented risk)

1. **Index/constraint diff ที่ไม่กระทบทันทีแต่มีความเสี่ยงระยะกลาง**
   - Verify SQL:
     ```sql
     select indexname, tablename
     from pg_indexes
     where schemaname = 'public'
       and tablename in ('incidents', 'checklist_sessions', 'document_approvals')
     order by tablename, indexname;
     ```
   - Pass: index สำคัญครบตาม migration
   - Fail: index หายหรือเกินจากแผน ให้บันทึก risk และ remediation

2. **Function/trigger mismatch ที่เกี่ยวข้อง workflow**
   - Verify: function หรือ trigger ที่ใช้ใน approval/document flow ไม่หายและไม่เปลี่ยน signature โดยไม่มี migration รองรับ
   - Pass: contract ตรงกับ release
   - Fail: mismatch ให้ block release หากกระทบ approval path

### Optional (nice-to-have / operational confidence)

1. **Snapshot diff report แนบใน release artifact**
   - Verify: มีผล query ก่อน/หลัง migration แนบกับ release notes
   - Pass: ทีมตรวจสอบย้อนหลังได้ทันที
   - Fail: ไม่มีเอกสาร diff แต่ release ได้ถ้า Critical ผ่านทั้งหมด

2. **Row count sanity checks สำหรับ master/setup data**
   - Verify SQL:
     ```sql
     select 'user_profiles' as table_name, count(*) as total from user_profiles
     union all
     select 'user_whitelist', count(*) from user_whitelist
     union all
     select 'workflow_configs', count(*) from workflow_configs;
     ```
   - Pass: จำนวนข้อมูลไม่ผิดปกติเมื่อเทียบ checkpoint ก่อนหน้า
   - Fail: พบ anomaly ให้บันทึกไว้และตรวจซ้ำหลัง deploy

---

## 7) Code Diff Checklist

> วัตถุประสงค์: ยืนยันว่า code ที่ปล่อย production ตรงกับ release intent และไม่ฝ่าฝืนข้อกำหนดความปลอดภัย/Workflow ของระบบ

### Critical (must-pass before production)

1. **Release tag ↔ commit ↔ deploy mapping ชัดเจน**
   - Verify: มี mapping ชัดเจนระหว่าง Git tag, commit SHA, migration files, Vercel deployment
   - Pass: trace ได้ครบทุกจุด
   - Fail: trace ไม่ครบ ให้หยุด release

2. **Approval flow ต้องวิ่งผ่าน [`workflow.js`](lib/workflow.js:1) เท่านั้น**
   - Verify: ไม่มีการสร้าง approval logic แยกนอกเส้นทาง workflow กลาง
   - Pass: ทุก approval action อ้างอิง flow กลาง
   - Fail: พบ bypass flow ให้ block release

3. **No UI hacks / no fake status mapping**
   - Verify: ไม่พบโค้ดแปลงสถานะเพื่อปกปิดข้อมูลผิดมาตรฐาน
   - Pass: สถานะมาจาก source data จริง
   - Fail: พบ logic ลักษณะ `x ? 'Closed' : y` เพื่อกลบข้อมูลจริง

4. **Supabase safety contract ไม่ถูกละเมิด**
   - Verify: ไม่มีการใช้ `service_role` ใน client-side และไม่มีโค้ด bypass RLS
   - Pass: ปลอดภัยตามมาตรฐาน security boundary
   - Fail: พบการละเมิด ให้หยุด release ทันที

### Warning (should-fix / documented risk)

1. **Cross-module side effects**
   - Verify: diff ไม่แตะ module อื่นเกิน scope ของ release โดยไม่มีเหตุผล
   - Pass: เปลี่ยนเฉพาะไฟล์ที่เกี่ยวข้อง
   - Fail: พบ side effect ให้เพิ่ม regression checklist หรือแยก PR

2. **Config drift ระหว่าง environment**
   - Verify: ตัวแปรสำคัญของ Vercel/Supabase ตรงกันระหว่าง staging/prod ตาม intended release
   - Pass: ไม่มี drift สำคัญ
   - Fail: มี drift ให้บันทึกความเสี่ยงและ fix ก่อนรอบถัดไป

### Optional (nice-to-have / operational confidence)

1. **Diff summary แนบ release note**
   - Verify: สรุปไฟล์แกนหลักที่เปลี่ยน พร้อมเหตุผล business/technical
   - Pass: ผู้อ่านประเมินผลกระทบได้เร็ว
   - Fail: ไม่มี summary แต่ไม่ block release ถ้า Critical ผ่าน

2. **Post-release quick audit script/list พร้อมใช้**
   - Verify: มี checklist หรือ query/script สั้นสำหรับตรวจหลัง deploy รอบแรก
   - Pass: ลดเวลา incident response หลังปล่อยจริง
   - Fail: ไม่มี artifact เสริม แต่ยัง deploy ได้

---

## 8) Admin Access Bootstrap (กรณีระบบใหม่ยังไม่มีผู้ใช้)

1. สร้าง user ใน Supabase Auth
2. เพิ่ม profile ลง `user_profiles`
3. เพิ่ม hash email ลง `user_whitelist`
4. ตั้ง role เป็น `admin`
5. ยืนยัน permission table มี `access_level` ครบ

> หมายเหตุ: ระบบ sidebar ใช้ permission แบบ `access_level` ใน [`lib/auth.js`](lib/auth.js:104)

---

## 9) Rollback Plan (ต้องเตรียมก่อน migrate)

### Layer 1: Code Rollback
- Revert ไป release tag ก่อนหน้า
- Redeploy บน Vercel

### Layer 2: Schema Rollback
- รัน rollback SQL ที่เตรียมไว้สำหรับ migration ชุดนั้น

### Layer 3: Data Restore
- Restore จาก backup snapshot ตามเวลา checkpoint

---

## 10) Operational Checklist (Short)

- [ ] Create pre-prod tag
- [ ] Backup schema/data
- [ ] Push code to prod repo
- [ ] Vercel deploy success
- [ ] Apply migrations
- [ ] Apply essential seeds
- [ ] Verify admin login + permissions
- [ ] Run smoke test
- [ ] Approve release / rollback

---

## 11) Related Files

- [`plans/migration_plan.md`](plans/migration_plan.md)
- [`supabase/migrations/20260505_base_schema_bootstrap.sql`](supabase/migrations/20260505_base_schema_bootstrap.sql)
- [`supabase/migrations/20260519_fill_missing_tables.sql`](supabase/migrations/20260519_fill_missing_tables.sql)
- [`scripts/seed_holidays_from_backup_2026.sql`](scripts/seed_holidays_from_backup_2026.sql)

