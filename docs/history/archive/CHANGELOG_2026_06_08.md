# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 8 มิถุนายน 2569 (08-Jun-2026)

- **[09:12] Daily Log Shrinking & Inspecting .cursorrules**
  - ย้ายบันทึกการเปลี่ยนแปลงของวันที่ 6 มิถุนายน 2569 ไปยัง [CHANGELOG_2026_06_06.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_06.md) ตามกฎ Daily Log Shrinking
  - ตรวจสอบไฟล์ `.cursorrules` เพื่อประเมินบทบาทและความจำเป็นในการอ่านของ Agents ในโปรเจกต์นี้
- **[09:14] Sync WINDSURF.md Rules with .cursorrules**
  - เพิ่มการอ้างอิงและกฎเหล็กจาก [docs/standards/WINDSURF.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/WINDSURF.md) เข้าไปใน [.cursorrules](file:///c:/Users/Lenovo/dowa-it-system/.cursorrules)
  - ปรับปรุง [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) เพื่อเชื่อมโยงประวัติย้อนหลังของปี 2026-06-05 และ 2026-06-06
- **[09:28] Update AGENTS.md with Silent Thinking Policy & Output Contracts**
  - เพิ่มนโยบาย `[SILENT THINKING POLICY — MANDATORY]` เข้าไปใน [AGENTS.md](file:///c:/Users/Lenovo/dowa-it-system/AGENTS.md)
  - อัปเดต `Superpowers Trigger Matrix` เพื่อกำหนดให้การทำงานที่ไม่ใช่ `brainstorming` ต้องใช้ `silent-execution`
  - เพิ่มข้อกำหนดสัญญาผลลัพธ์ (`Output Contract`) ให้แก่บทบาท `Smart AI` และ `Fast AI` ภายใต้ `AGENTS.md`
- **[09:31] Create SILENT_EXECUTION.md Standard File**
  - สร้างไฟล์เปล่า [docs/standards/SILENT_EXECUTION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SILENT_EXECUTION.md) สำหรับเป็นที่ตั้งของนโยบายและมาตรฐานการทำงานแบบประมวลผลเงียบ
  - อัปเดตลิงก์ไปยังมาตรฐานใหม่ลงใน [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md)
- **[10:00] Audit Incident 404 Route Runtime Desync**
  - ตรวจสอบปัญหา `/dashboard/incidents` ตอบ `404` จาก runtime จริง แม้ route file จะมีอยู่และถูก compile แล้ว
  - สร้างรายงาน [AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md)
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมลิงก์รายงาน audit ฉบับนี้
- **[10:12] Restore Dashboard Child Routes by Restarting Next Dev Runtime**
  - หยุด runtime เก่าที่ให้บริการ `localhost:3000` แล้ว start `next dev` ใหม่จาก workspace ปัจจุบัน
  - ยืนยันว่า `/dashboard/incidents` และ `/dashboard/backup` กลับมาใช้งานได้จริง
  - อัปเดตรายงาน [AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md) ด้วยผลการแก้ไขและ verification ล่าสุด
- **[10:30] ขยายคอลัมน์ Doc No. และลดคอลัมน์ Review ใน Audit Logs Tab**
  - ปรับ `minWidth: 160` ให้คอลัมน์ Doc No. ใน Audit Logs tab เพื่อให้เลขที่เอกสารแสดงแบบ 1 บรรทัด
  - เพิ่ม `whiteSpace: 'nowrap'` ที่ cell Doc No. ป้องกันการตัดคำ
  - ลดความกว้างคอลัมน์ Review จาก `16px 20px` → `12px 8px` และเซ็ต `width: 80` พร้อม `textAlign: 'center'`
  - เปลี่ยนข้อความปุ่ม "View Details" → "View" เพื่อให้สั้นลง
  - ไฟล์ที่แก้: `app/dashboard/settings/logs/page.js`
- **[10:39] ปรับชื่อคอลัมน์ Doc No. เป็นแบบไดนามิก (Dynamic Column Header)**
  - ปรับปรุงให้หน้าจอแสดงผลหัวคอลัมน์จากเดิมที่เป็น "Doc No." ให้กลายเป็น "Target User" เมื่อผู้ใช้เปิดแท็บ "Admin Actions" (เนื่องจากคอลัมน์นี้ใช้แสดงผล Email หรือ UUID ของผู้ใช้เป้าหมายในการดำเนินการของ Admin)
  - ไฟล์ที่แก้: `app/dashboard/settings/logs/page.js`
- **[12:00] แสดงวันที่ Backup จริง (log_date) ในคอลัมน์ Details ของ Backup Logs**
  - นำค่า `log_date` (วันที่ทำการ Backup จริง) มาจัดรูปแบบผ่าน `formatDate` แล้วแสดงผลนำหน้าข้อมูล `notes` ในคอลัมน์ Details เช่น `[Backup: 01 / Jun / 2026] ...` เพื่อแก้ไขปัญหาเมื่อมีการบันทึกข้อมูลย้อนหลัง
  - ไฟล์ที่แก้: `lib/audit.js`
- **[14:26] ตรวจสอบและแก้ไขระบบตาม WORKFLOW_GUIDE.md**
  - ตรวจสอบ 95% ของ flow ตาม [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) — พบ 2 จุดที่ต้องแก้ไข
  - **(A) แก้ bug เอกสาร:** ลบ Section §5 Backup Logs ที่ซ้ำซ้อนออกจาก [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) — ลำดับ section ถูกต้องแล้ว: §5=IT Checklist, §6=Backup Logs, §7=System Setup
  - **(B) แก้ bug code + implement feature:** แก้ไข `notifyApprover` function ใน [workflow.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/workflow.js)
    - แก้ bug ที่ query table `profiles` ผิด → `user_profiles` (ทำให้ email notification ไม่เคยส่งได้เลย)
    - เพิ่ม Substitute Notification logic — ตรวจสอบ `approval_substitutes` ที่ `is_active=true` และอยู่ในช่วงวันที่ปัจจุบัน แล้วส่ง email แจ้งเตือนไปหา substitute พร้อมระบุว่าเป็นการแทน primary approver คนใด
- **[15:05] Add Development-First Migration Policy and Draft 4 Permanent Docs**
  - อัปเดต [AGENTS.md](file:///c:/Users/Lenovo/dowa-it-system/AGENTS.md) เพิ่ม `Migration Mode Router` ให้ default เป็น `Development Mode` และบังคับอธิบาย 3 โหมดก่อนทุกครั้งเมื่อ USER พูดถึง migration / production
  - เพิ่ม policy ให้แยก `Development Mode`, `Migration Planning Mode`, และ `Production Migration Mode` พร้อมผูกกับ repo / Supabase จริงของโปรเจกต์
  - สร้างเอกสารถาวรใหม่ 4 ไฟล์:
    - [DEV_PROD_OPERATING_POLICY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DEV_PROD_OPERATING_POLICY.md)
    - [MIGRATION_COMMAND_CONTRACT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/MIGRATION_COMMAND_CONTRACT.md)
    - [PRODUCTION_MIGRATION_SOP.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_MIGRATION_SOP.md)
    - [RELEASE_AND_ROLLBACK_CHECKLIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md)
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมลิงก์เอกสารใหม่ทั้งหมด
- **[15:16] Split Migration Repo & Environment into Dedicated INDEX Section**
  - เพิ่ม section ใหม่ `Migration Repo & Environment` ใน [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) เพื่อรวมเอกสารด้าน migration repo / environment ไว้ในจุดเดียว
  - ย้ายรายการ migration governance และ migration execution ออกจากหมวด `Development Standards` และ `Manuals & Guides` เพื่อลดความซ้ำซ้อนและช่วยให้ AI route context ได้เร็วขึ้น
- **[16:26] Add Final In-Scope Table List for Production Re-baseline**
  - สร้างเอกสาร [PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md) เพื่อสรุป `table / action / fields / dependency / note` สำหรับ production re-baseline migration ครั้งแรก
  - ระบุ baseline seed order, selected user carry-forward policy, reset-empty tables, และ must-verify items เพื่อใช้เป็นต้นฉบับของ execution runbook
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมลิงก์เอกสาร migration ฉบับใหม่นี้
- **[16:29] Add Production Re-baseline Execution Runbook**
  - สร้างเอกสาร [PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md) เพื่อแปลง migration planning ให้เป็น execution runbook แบบ phase-by-phase
  - ระบุ entry gate, must-verify items, extraction flow, production reset flow, schema apply order, baseline seed apply order, selected user bootstrap, verification, rollback triggers, และ deliverables
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมลิงก์ execution runbook ฉบับนี้
- **[16:32] Add Schema Verification Checklist and Seed Extraction Mapping**
  - สร้างเอกสาร [PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md) เพื่อใช้ปิด must-verify items ด้าน schema/runtime contract ก่อน execute จริง
  - สร้างเอกสาร [PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md) เพื่อกำหนดวิธี extract / transform / import สำหรับแต่ละ table ใน scope
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมลิงก์เอกสารทั้ง 2 ฉบับ
- **[17:03] Audit Production Re-baseline Schema Verification Checklist**
  - ตรวจเทียบ `supabase/migrations/`, runtime code, และ `dev Supabase` schema/state จริง แล้วบันทึกรายงานไว้ที่ [AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md)
  - สรุปผลว่า `workflow_configs`, `checklist_templates/checklist_procedure_plans`, `no_series`, selected users, และ approver references ผ่านการตรวจ
  - พบ drift สำคัญ 2 จุดที่ยัง block execution runbook: `approval_substitutes` column mismatch และ `checklist_target_groups/target_group_id` ยังหลงเหลือใน live dev schema
  - บันทึก security finding เพิ่มเติมว่า `approval_substitutes`, `working_hours`, `sla_exclusions`, และ `sla_holidays` ยังมี RLS disabled บน dev Supabase
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมลิงก์รายงาน audit ฉบับนี้
- **[17:35] Prepare Remediation Migration for Schema-to-Code Alignment**
  - สร้าง migration [20260608_align_substitute_and_target_group_schema_to_runtime.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260608_align_substitute_and_target_group_schema_to_runtime.sql) เพื่อปรับ `approval_substitutes` ให้ตรงกับคอลัมน์ที่โค้ดใช้งานจริง และ cleanup legacy `checklist_target_groups/target_group_id`
  - พยายาม apply migration เข้า `dev Supabase` แล้ว แต่ถูกบล็อกด้วยข้อความ `Cannot apply migration in read-only mode.` จาก connector ปัจจุบัน
  - อัปเดตรายงาน [AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md) ให้ระบุสถานะ remediation ล่าสุด
- **[18:02] Re-verify Schema After Manual Dev Migration Apply**
  - ตรวจ `dev Supabase` ซ้ำหลัง apply manual แล้ว พบว่า `approval_substitutes` ถูก align เป็น `substitute_id/start_date/end_date/reason` ตรงกับโค้ดปัจจุบัน
  - ยืนยันว่าไม่มี `checklist_target_groups` และไม่มี `checklist_template_targets.target_group_id` แล้วใน live dev schema
  - อัปเดตรายงาน [AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md) ให้ปิด 2 findings เดิมและเปลี่ยนสถานะ checklist เป็น `PASS WITH SECURITY FOLLOW-UP`
- **[18:20] Draft RLS Remediation Plan for Legacy SLA Tables and Approval Substitutes**
  - สร้าง [PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md) เพื่อแยก remediation strategy ระหว่าง runtime table (`approval_substitutes`) กับ legacy tables (`working_hours`, `sla_exclusions`, `sla_holidays`)
  - สร้าง migration [20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql) สำหรับ enable RLS และวาง policy ชุดแรก
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) และเชื่อมเอกสาร remediation plan เข้ากับรายงาน audit ล่าสุด
- **[18:28] Record Pending Task for Tomorrow**
  - บันทึกงานค้างลง [USER_TASKS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/USER_TASKS.md) สำหรับ `Production Re-baseline RLS Follow-up`
  - ระบุ scope ที่ต้องทำต่อคือ apply migration RLS บน dev และ verify policy behavior ของ `approval_substitutes`, `working_hours`, `sla_exclusions`, `sla_holidays`
  - บันทึกหมายเหตุว่า `npm test` ที่ fail ล่าสุดเป็นปัญหาเดิมของ `lib/audit.js` และไม่ใช่ regression จาก RLS migration ชุดนี้

---

## 📦 บันทึกย้อนหลัง (Archives)

### มิถุนายน 2569 (June 2026)
- [CHANGELOG_2026_06_06.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_06.md)
- [CHANGELOG_2026_06_05.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_05.md)
- [CHANGELOG_2026_06_04.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_04.md)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_29.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_29.md)
- [CHANGELOG_2026_05_28.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_28.md)
- [CHANGELOG_2026_05_27.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_27.md)
- [CHANGELOG_2026_05_26.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_26.md)
- [CHANGELOG_2026_05_25.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_25.md)
- [CHANGELOG_2026_05_21.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_21.md)
- [CHANGELOG_2026_05_20.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_20.md)
- [CHANGELOG_2026_05_19.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_19.md)
- [CHANGELOG_2026_05_18.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_18.md)
- [CHANGELOG_2026_05_17.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_17.md)
- [CHANGELOG_2026_05_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_15.md)
- [CHANGELOG_2026_05_14.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_14.md)
- [CHANGELOG_2026_05_13.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_13.md)
- [CHANGELOG_2026_05_12.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_12.md)
- [CHANGELOG_2026_05_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_11.md)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 08-Jun-2026 18:28*
