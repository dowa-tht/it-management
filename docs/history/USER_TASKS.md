# 📋 รายการงาน (Task Tracker)

**อัปเดตล่าสุด:** 9 มิถุนายน 2569

---

## ⏳ งานรอทดสอบ (Pending Verification)

ไม่มีงานที่อยู่ระหว่างรอทดสอบใน tracker นี้ ณ ตอนอัปเดตล่าสุด

---

## ✅ งานที่เสร็จสิ้นแล้ว (Completed)

### 30. Production Re-baseline Final Artifact Templates and User Remap Pack
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 9 มิถุนายน 2569
- **รายละเอียด:**
  - สร้าง template ใช้งานจริงสำหรับ `release inventory`, `export row counts`, และ `verification result`
  - สร้าง [PRODUCTION_REBASELINE_SELECTED_USER_BOOTSTRAP_AND_REMAP_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SELECTED_USER_BOOTSTRAP_AND_REMAP_PLAN.md) เพื่อปิด flow selected-user bootstrap, source->target user-id mapping, และ downstream reference remap
  - เชื่อมเอกสารใหม่เข้ากับ migration section ใน [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) เพื่อให้หยิบใช้ต่อเนื่องในวัน execute จริงได้
- **ไฟล์ที่เกี่ยวข้อง:**
  - `docs/manuals/PRODUCTION_REBASELINE_RELEASE_INVENTORY_TEMPLATE.md`
  - `docs/manuals/PRODUCTION_REBASELINE_EXPORT_ROW_COUNTS_TEMPLATE.md`
  - `docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_RESULT_TEMPLATE.md`
  - `docs/manuals/PRODUCTION_REBASELINE_SELECTED_USER_BOOTSTRAP_AND_REMAP_PLAN.md`
  - `docs/INDEX.md`

### 29. Production Re-baseline SQL Query Packs
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 9 มิถุนายน 2569
- **รายละเอียด:**
  - สร้าง [PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md) สำหรับ export SQL แบบ table-by-table จาก `dev Supabase`
  - สร้าง [PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md) สำหรับ post-import verification SQL บน `production target`
  - ผูก query packs เข้ากับ export artifact plan, import command pack, และ verification run sequence เพื่อให้วัน migration จริงใช้เอกสารเป็นชุดต่อเนื่องได้
- **ไฟล์ที่เกี่ยวข้อง:**
  - `docs/manuals/PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md`
  - `docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md`
  - `docs/INDEX.md`

### 28. Production Re-baseline Execution Artifacts Pack
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 9 มิถุนายน 2569
- **รายละเอียด:**
  - สร้าง [PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md) เพื่อกำหนด artifact groups, metadata, export order, table filters, และ integrity checks
  - สร้าง [PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md) เพื่อสรุปลำดับ schema apply / seed import / selected-user remap / stop conditions สำหรับวัน execute จริง
  - สร้าง [PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md) เพื่อทำ post-import verification แบบ run ตามลำดับก่อนเปิด production
- **ไฟล์ที่เกี่ยวข้อง:**
  - `docs/manuals/PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md`
  - `docs/manuals/PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md`
  - `docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md`
  - `docs/INDEX.md`

### 27. Production Re-baseline Apply Order and Security Hardening Backlog
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 9 มิถุนายน 2569
- **รายละเอียด:**
  - สร้างเอกสาร [PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md) เพื่อสรุป first production migration order แบบ operator-friendly
  - สร้างเอกสาร [IMPLEMENTATION_PLAN_PRODUCTION_SECURITY_HARDENING_BACKLOG.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_SECURITY_HARDENING_BACKLOG.md) เพื่อแยก hardening backlog ออกจาก first migration cut
  - อัปเดตเอกสาร migration ฐานให้ตรงกับ audit ล่าสุด:
    - เพิ่ม migrations วันที่ `2026-06-08`
    - เปลี่ยน `approval_substitutes` จาก `verify-first` เป็น `seed-all`
    - ย้าย selected-user bootstrap ให้อยู่ก่อน `workflow_configs` และ `approval_substitutes`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md`
  - `docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md`
  - `docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md`
  - `docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md`
  - `docs/history/IMPLEMENTATION_PLAN_PRODUCTION_SECURITY_HARDENING_BACKLOG.md`
  - `docs/INDEX.md`

### 26. Production Re-baseline RLS Follow-up for Legacy SLA Tables and Approval Substitutes
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 9 มิถุนายน 2569
- **รายละเอียด:**
  - apply manual migration `supabase/migrations/20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql` บน `dev Supabase` สำเร็จ
  - ยืนยันจาก live schema ว่า `approval_substitutes`, `working_hours`, `sla_exclusions`, `sla_holidays` มี `rls_enabled = true`
  - ยืนยันจาก `pg_policies` ว่า:
    - `approval_substitutes` มี `admin_all_*` และ owner/substitute policies ครบ
    - `working_hours`, `sla_exclusions`, `sla_holidays` ถูก lock เป็น `admin_all_*` ตามแผน
  - ปิด blocker เดิมเรื่อง `RLS disabled` สำหรับ production re-baseline บนฝั่ง dev
  - หมายเหตุ: ยังมี advisory อื่นนอก scope นี้ เช่น `user_whitelist` และ function hardening ซึ่งยังไม่ได้รวมในรอบนี้
- **ไฟล์ที่เกี่ยวข้อง:**
  - `supabase/migrations/20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql`
  - `docs/manuals/PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md`
  - `docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md`

### 25. Audit Trail & Logs Viewer Close-Out + Auditor RLS Leak Remediation
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 6 มิถุนายน 2569
- **รายละเอียด:**
  - ปิด manual verification ของแผน `IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER`
  - ยืนยันว่า Incident edit, Checklist edit, Working Hours settings change, Admin Actions tab, และ Backup Logs tab ทำงานและเขียน audit ได้จริง
  - พบ live RLS drift ที่ทำให้ `auditor` ยังเขียน `incidents` และ `checklist_items` ได้ แม้ UI เป็น read-only
  - สร้าง migration `supabase/migrations/20260606_fix_auditor_readonly_rls_leaks.sql` เพื่อปิด permissive policies และแยก read/write helper ให้ตรงตาม contract
  - ยืนยันหลัง apply migration ว่า `auditor` ยังอ่านข้อมูลที่อนุญาตได้ แต่ write attempts ให้ผล `0 rows` และไม่แก้ข้อมูลจริง
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/audit.js`
  - `app/dashboard/settings/logs/page.js`
  - `lib/audit.js`
  - `tests/audit-log-contract.test.js`
  - `supabase/migrations/20260606_fix_auditor_readonly_rls_leaks.sql`
  - `docs/history/IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER.md`

### 24. Fix Dashboard "My Sent Pending" False Positive & Align isCreator Logic
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 4 มิถุนายน 2569
- **รายละเอียด:**
  - แก้ปัญหาที่ Dashboard แสดงจำนวน `MY SENT PENDING` เป็น 1 สำหรับเคสที่ user เป็น Reporter แต่ไม่ใช่ Sender (False Positive)
  - ปรับปรุง query ใน `app/actions/dashboard.js` (`getDashboardData`) ให้เทียบ `assigned_to_id` (เจ้าหน้าที่ไอทีที่รับผิดชอบและส่งงานขออนุมัติ) แทน `reported_by_id` (ผู้แจ้ง)
  - ปรับปรุง query ใน `app/actions/workflow.js` (`getMySentPendingItems`) ให้สอดคล้องกันเพื่อให้ดึงข้อมูลในหน้ารายการ /dashboard/my-pending ตามเจ้าหน้าที่รับผิดชอบจริง
  - ปรับปรุง Incident Detail Page (`app/dashboard/incidents/[id]/page.js`):
    - แยกแยะ `isCreator` (เทียบ `created_by_id`) และ `isReporter` (เทียบ `reported_by_id`) ออกจากกันอย่างถูกต้อง
    - อัปเดต `canApprove` ของ reporter step ให้ใช้ `isReporter`
    - รักษาปุ่ม `canCancel` ให้ขึ้นจำกัดเฉพาะผู้ส่งเรื่อง `isCreator` เท่านั้น
  - ยืนยันว่ารัน `npm run build` สำเร็จ 100% ไม่มีข้อผิดพลาด
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/dashboard.js`
  - `app/actions/workflow.js`
  - `app/dashboard/incidents/[id]/page.js`

### P1. ทดสอบ Reopen เอกสาร Incident หลังปรับ Logic SLA-safe
- **สถานะ:** ✅ ทดสอบผ่านแล้ว
- **วันที่บันทึก:** 29 พฤษภาคม 2569
- **วันที่ทดสอบ:** 4 มิถุนายน 2569
- **รายละเอียด:**
  - ทดสอบการกด Reopen บนเอกสาร Incident ที่เคยผ่าน Acknowledge/Assign แล้ว
  - ✅ ยืนยันว่าเคสกลับไป `In Progress` (ไม่ใช่ `Open`) เมื่อมี context เดิมของงาน
  - ✅ ยืนยันว่าไม่เกิด error schema mismatch ระหว่าง Reopen
  - ✅ ตรวจสอบว่า log `Reopen Case` ถูกบันทึกตามปกติ
  - ✅ ตรวจสอบว่าการคำนวณ SLA ไม่เพี้ยนจากการบังคับ Acknowledge ใหม่
  - สามารถใช้งานได้ตามต้องการแล้ว

### 23. Fix Remote Approve Modal: Display External Reporter Email Correctly
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 4 มิถุนายน 2569
- **รายละเอียด:**
  - แก้ปัญหาที่ Remote Approve Modal แสดง "ไม่พบอีเมลผู้อนุมัติ" สำหรับ external reporter
  - เพิ่ม props targetEmail และ targetEmailLabel ใน UnifiedApprovalModal component
  - อัปเดต Incident Detail Page ให้ส่ง reporter email พร้อม label "External user"
  - Modal แสดง `reporter@example.com (External user)` แทน "ไม่พบอีเมลผู้อนุมัติ"
  - Build ผ่านสำเร็จและ push ขึ้น GitHub แล้ว
- **ไฟล์ที่เกี่ยวข้อง:**
  - `components/workflow/UnifiedApprovalModal.js`
  - `app/dashboard/incidents/[id]/page.js`
  - `docs/history/CHANGELOG.md`

### 22. Incident External Reporter OTP + Public Follow-up + Workflow Reporter Alignment
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 29 พฤษภาคม 2569
- **รายละเอียด:**
  - เพิ่ม flow ผู้แจ้งภายนอก (external reporter) สำหรับ Incident โดยบังคับ OTP verify ก่อนสร้างเคส
  - เพิ่มระบบ public follow-up link (read-only) อายุ 7 วัน พร้อมระบบส่งลิงก์ใหม่ (resend) และบันทึก logs
  - ปรับ fallback base URL ของอีเมล follow-up ให้รองรับหลาย environment และแก้ปัญหา `NEXT_PUBLIC_SITE_URL` ไม่ถูกตั้งค่า
  - เพิ่ม API/Route สำหรับเปิดดูความคืบหน้าโดยไม่พึ่ง session login และไม่กระทบ account management เดิม
  - ปรับ UI public follow-up ให้แสดง Section ชัดเจน รวม Root Cause Analysis / Resolution / Corrective Action
  - ปรับ workflow mapping บทบาท Reporter ของ Incident ให้สอดคล้องข้อมูล `reported_by_id` และรองรับ external reporter ที่ไม่มี account
  - เพิ่ม auto-link incident เก่าอัตโนมัติเมื่อมีการสร้าง account จาก reporter email ในภายหลัง
  - แก้ regression จาก schema mismatch หลายจุด (transient payload fields และ query fields ที่ไม่อยู่ใน schema)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/incidents.js`
  - `app/actions/workflow.js`
  - `app/actions/admin.js`
  - `app/api/incidents/followup/route.js`
  - `app/public/incidents/followup/[id]/page.js`
  - `app/dashboard/incidents/[id]/page.js`
  - `app/dashboard/incidents/new/page.js`
  - `supabase/migrations/20260529_incident_followup_tokens.sql`
  - `supabase/migrations/20260529_fix_incident_reporter_approver_mapping.sql`

### 21. Agent Knowledge — WINDSURF.md Skill Document
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 26 พฤษภาคม 2569
- **รายละเอียด:**
  - สร้างเอกสาร `WINDSURF.md` ที่ root folder บันทึกหลักการทำงานของ Cascade Agent แบบละเอียด
  - ครอบคลุม 8 ส่วน: Philosophy of Thought, Operating Process, Systematic Debugging, Communication Principles, Code Standards, Pre-Delivery Verification, Hard Stop Rules, Mental Model
  - ใช้ตัวอย่างจากเหตุการณ์จริงในโปรเจกต์เพื่อให้ Agent ตัวอื่น relate ได้ทันที
- **ไฟล์ที่เกี่ยวข้อง:**
  - `WINDSURF.md`

### 20. cancelDocument Bug Fix + Admin Cancel Script
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 26 พฤษภาคม 2569
- **รายละเอียด:**
  - พบ bug `cancelDocument()` query `reported_by_id` จาก `checklist_docs` ซึ่งไม่มี column นั้น → error ขณะ Admin กดยกเลิก
  - Root cause: `app/actions/workflow.js` line 1158 hardcode `reported_by_id` ใน select ทุก doc type
  - สร้าง `scripts/cancel_checklist_admin.js` ให้ Admin ยกเลิกเอกสารได้ผ่าน Supabase client (Service Role) โดยไม่แตะ DB ตรงๆ
  - รัน script ยกเลิก `DTT-CHK-2605-006` สำเร็จ พร้อมบันทึก audit log ด้วย `user_email` field ที่ถูกต้อง
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/workflow.js` (bug location — ยังไม่ได้แก้ source, ใช้ script แทน)
  - `scripts/cancel_checklist_admin.js`

### 19. Workflow Approval — Login vs Remote Approve Differentiation
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 26 พฤษภาคม 2569
- **รายละเอียด:**
  - แก้ `UnifiedApprovalModal` ให้แยก 2 mode: Login Approve (ไม่มี Signature/PIN, confirm ได้ทันที) vs Remote Approve (ต้อง Signature + PIN)
  - เพิ่ม `needPin = requirePin !== undefined ? requirePin : isRemote` เพื่อ control PIN visibility ตาม mode
  - แก้ `checklist/[id]/page.js`: เพิ่ม `canRemoteApprove` (เฉพาะ Sender = `created_by_id`), แยก 2 modal, เพิ่ม `handleRemoteApprove` handler แยกต่างหาก
  - แก้ `incidents/[id]/page.js`: เปลี่ยน `canRemoteApprove` จาก `hasFullAccess` → `currentUser.id === incident.created_by_id`, เพิ่ม `isRemoteApprovalMode` state, แยก Login Modal และ Remote Modal
  - แก้ `checklist/page.js`: badge สีแดงสำหรับ status Cancelled ใน list/card view + เพิ่ม filter option
  - Build ผ่าน, commit `4f71ec3`, push to `origin/main`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `components/workflow/UnifiedApprovalModal.js`
  - `app/dashboard/checklist/[id]/page.js`
  - `app/dashboard/checklist/page.js`
  - `app/dashboard/incidents/[id]/page.js`

### 18. Checklist Detail UI Redesign & Time Tracking
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 25 พฤษภาคม 2569
- **รายละเอียด:**
  - สร้าง Database Migration เพิ่ม columns สำหรับ time tracking และ evaluation (checklist_items, checklist_docs)
  - พัฒนา Time Tracking Section: เวลาเริ่มต้น (DD/MMM/YYYY HH:mm), เวลาสิ้นสุด (คำนวณอัตโนมัติ), ระยะเวลารวม
  - ออกแบบ UI ใหม่สำหรับแต่ละรายการตรวจสอบ:
    - ขั้นตอนการดำเนินการ (แสดงจาก instruction)
    - ผู้รับผิดชอบ (input field)
    - เกณฑ์วัดผลการซ้อม (input field)
    - เวลาดำเนินการ (HH:mm input ต่อรายการ)
    - ผลการประเมิน (OK/NG buttons)
  - พัฒนา auto-calculation สำหรับเวลาสิ้นสุดจาก start_time + sum(duration_minutes)
  - รัน `npm test` ผ่าน 100% (12/12 tests passed)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/checklist/[id]/page.js`
  - `supabase/migrations/20260525_checklist_time_tracking.sql`
  - `docs/history/CHANGELOG.md`

### 17. Cancel Document Feature (Workflow Engine)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 25 พฤษภาคม 2569
- **รายละเอียด:**
  - พัฒนา Server Action `cancelDocument()` สำหรับยกเลิกเอกสาร Checklist และ Incident พร้อมตรวจสอบสิทธิ์
  - พัฒนา Server Action `requestIncidentCancelOTP()` สำหรับขอ OTP ยืนยันตัวตนผู้แจ้ง (Reporter)
  - อัปเดต `WorkflowActionBar` รองรับปุ่มยกเลิกและแสดงสถานะ Cancelled
  - สร้าง Incident Cancel UI พร้อม PIN/OTP verification
  - พัฒนา Database Migration สำหรับ cancellation logs
  - รัน `npm test` ผ่าน 100% (12/12 tests passed)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/workflow.js`
  - `app/actions/incidents.js`
  - `app/dashboard/incidents/[id]/page.js`
  - `app/dashboard/checklist/[id]/page.js`
  - `components/workflow/WorkflowActionBar.js`
  - `supabase/migrations/20260524_incident_cancellation.sql`
  - `docs/history/CHANGELOG.md`

### 16. Workflow Settings - Filter Users by Selected Role
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 23 พฤษภาคม 2569
- **รายละเอียด:**
  - พัฒนา API endpoint สำหรับดึงรายชื่อ user ตาม role ที่เลือก
  - อัปเดต Workflow Settings UI ให้ filter user dropdown ตาม role
  - แก้ปัญหา performance เมื่อมี user จำนวนมาก
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/api/workflow/users-by-role/route.js`
  - `app/dashboard/settings/workflow/page.js`

### 15. Procedure Plan Editor - Label Change
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 23 พฤษภาคม 2569
- **รายละเอียด:**
  - เปลี่ยน label จาก "Instruction" เป็น "Step Description" ใน Procedure Plan Editor
  - ปรับ UI ให้สอดคล้องกับ terminology ใหม่
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/procedure-plan-editor/components/StepForm.js`

### 14. Mobile Photo Verification & Image Compression Audit
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 22 พฤษภาคม 2569
- **รายละเอียด:**
  - ตรวจสอบและแก้ไขปัญหา mobile photo verification
  - ตรวจสอบและปรับปรุง image compression logic
  - แก้ปัญหา photo upload บน mobile devices
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/checklist.js`
  - `app/dashboard/checklist/[id]/page.js`

### 13. Separation of Incident Creator & Requester, and Workflow Settings UX & Guide Hardening
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 21 พฤษภาคม 2569
- **รายละเอียด:**
  - แยกฟิลด์ `created_by_id` (Creator) และ `reported_by_id` (Requester) ใน incidents table
  - อัปเดต Workflow Settings UI ให้ชัดเจนและใช้งานง่ายขึ้น
  - เพิ่ม guide และ helper text ในหน้าจอต่างๆ
- **ไฟล์ที่เกี่ยวข้อง:**
  - `supabase/migrations/20260521_incident_creator_requester_separation.sql`
  - `app/dashboard/settings/workflow/page.js`
  - `app/dashboard/incidents/new/page.js`

### 11. Verification and Audit for Checklist Duplicate Prevention & DB Read-Only Status Analysis
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 20 พฤษภาคม 2569
- **รายละเอียด:**
  - ตรวจสอบระบบป้องกัน duplicate checklist
  - วิเคราะห์สถานะ DB read-only
  - แก้ไขปัญหาที่พบ
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/checklist.js`
  - Database audit reports

### 12. Harden Asset History Architecture หลังจบ Target Registry Foundation
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 19 พฤษภาคม 2569
- **รายละเอียด:**
  - ปรับปรุง architecture ของ Asset History
  - เพิ่ม security layers และ validation
  - ปรับปรุง performance
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/target.js`
  - `app/api/qr/lookup/route.js`

### 8. Settings Module UI/UX Stabilization (Checklist Master Data)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 18 พฤษภาคม 2569
- **รายละเอียด:**
  - ปรับปรุง UI/UX หน้าจอ Checklist Master Data
  - แก้ปัญหา layout และ spacing
  - เพิ่ม validation และ error handling
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/checklist-master-data/page.js`

### 9. Checklist Point History & Photo UI Hardening
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 17 พฤษภาคม 2569
- **รายละเอียด:**
  - พัฒนา UI สำหรับแสดงประวัติ checklist point
  - ปรับปรุง photo upload UI
  - แก้ปัญหา display บน mobile devices
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/checklist/[id]/page.js`
  - `app/actions/checklist.js`

### 10. Agent Mandatory Workflow (npm test requirement)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 16 พฤษภาคม 2569
- **รายละเอียด:**
  - บังคับให้รัน `npm test` ก่อนจบงานทุกครั้ง
  - เพิ่ม test suite สำหรับส่วนสำคัญของระบบ
  - อัปเดต AGENTS.md
- **ไฟล์ที่เกี่ยวข้อง:**
  - `AGENTS.md`
  - `tests/`

### 1. Incident Accept/Dispatch Audit-Safe Workflow
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 15 พฤษภาคม 2569
- **รายละเอียด:**
  - พัฒนา workflow สำหรับ Incident Accept/Dispatch ที่ปลอดภัยต่อ audit
  - เพิ่ม audit logs สำหรับทุก action
  - ปรับปรุง security validation
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/incidents.js`
  - `app/actions/workflow.js`

### 2. แก้ไข revalidatePath Error ใน Admin Actions
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - แก้ปัญหา revalidatePath error ใน admin actions
  - ปรับปรุง cache invalidation logic
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/admin.js`

### 3. ลบ Dev Cache และ Restart Server
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:**
  - ลบ cache และ restart dev server
  - แก้ปัญหา stale data
- **ไฟล์ที่เกี่ยวข้อง:**
  - Dev environment cleanup

### 4. ตรวจสอบและอัปเดต User Role
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 12 พฤษภาคม 2569
- **รายละเอียด:**
  - ตรวจสอบ user role ทั้งหมดในระบบ
  - อัปเดต role ที่ไม่ถูกต้อง
- **ไฟล์ที่เกี่ยวข้อง:**
  - Database role updates

### 5. สร้าง RLS Migration Script
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 11 พฤษภาคม 2569
- **รายละเอียด:**
  - สร้าง migration script สำหรับ RLS policies
  - ทดสอบและ verify RLS
- **ไฟล์ที่เกี่ยวข้อง:**
  - `supabase/migrations/`

### 6. อัปเดต Project Agent Rules
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 10 พฤษภาคม 2569
- **รายละเอียด:**
  - อัปเดต AGENTS.md
  - เพิ่ม rules ใหม่สำหรับ AI agents
- **ไฟล์ที่เกี่ยวข้อง:**
  - `AGENTS.md`

### 7. Settings Audit Remediation (TASK-001 ถึง TASK-003)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 9 พฤษภาคม 2569
- **รายละเอียด:**
  - แก้ไขปัญหาที่พบจาก settings audit
  - ปรับปรุง validation และ error handling
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/`

---

## 🔄 งานที่กำลังดำเนินการ (In Progress)

ไม่มีงานที่กำลังดำเนินการอยู่ใน tracker นี้ ณ ตอนอัปเดตล่าสุด

---

## ✅ งานที่ตรวจสอบแล้วและปิดได้เพิ่ม (Verified & Closed)

### P3. Auditor Expiry Quick Extend In Account Management
- **สถานะ:** ✅ ทดสอบผ่านแล้ว / ปิดงานได้
- **วันที่พัฒนา:** 5 มิถุนายน 2569
- **วันที่ยืนยันผลทดสอบ:** 5 มิถุนายน 2569
- **รายละเอียด:**
  - เพิ่มมาตรฐาน `auditor expiry` ที่ `default = 3 วัน` และ quick extend options `3/7/15/30 วัน`
  - เพิ่ม action `extendAuditorExpiry(userId, days)` ใน `app/actions/admin.js` สำหรับ `admin` เท่านั้น
  - flow ต่ออายุ, role switch, confirm dialog, และการ clear/set `expires_at` ผ่านการทดสอบแล้ว
  - ยืนยันว่า flow ปกติของ `Account Management` ไม่ regress

### P2. Checklist Auditor Read-Only RLS Alignment
- **สถานะ:** ✅ ทดสอบผ่านแล้ว / ปิดงานได้
- **วันที่พัฒนา:** 5 มิถุนายน 2569
- **วันที่ยืนยันผลทดสอบ:** 5 มิถุนายน 2569
- **รายละเอียด:**
  - migration `supabase/migrations/20260605_checklist_auditor_readonly_rls.sql` และ helper `current_user_can_read_checklist_doc()` ถูกใช้งานร่วมกับ read-only policy ที่แยกจาก write path เดิม
  - flow read-only ของ `auditor` ใน `checklist`, `incidents`, `backup`, `reports/sla`, `holidays`, `logs`, `Target Registry`, และ `Procedure Plans` ผ่านการทดสอบแล้ว
  - ยืนยันว่า `auditor` อ่านข้อมูลได้ตาม scope ที่ออกแบบไว้ โดยยังไม่สามารถ create/update/delete ข้อมูลได้
  - ยืนยันว่า flow เดิมของ `admin`, `it_staff`, และ `approver` ไม่ regress
  - **Follow-up (06-Jun-2026):** พบ live policy drift เพิ่มเติมใน production-like DB และแก้ด้วย migration `20260606_fix_auditor_readonly_rls_leaks.sql` เพื่อปิด write leak ที่ยังค้างจริง

### 1. เตรียมข้อมูล UAT สำหรับ Target Registry / QR Asset History
- **สถานะ:** ✅ ตรวจสอบแล้ว / ปิดงานได้
- **วันเริ่ม:** 20 พฤษภาคม 2569
- **อัปเดตล่าสุด:** 27 พฤษภาคม 2569
- **รายละเอียด:**
  - เตรียมแผนลงรายละเอียด database seeding และ template mapping strategy
  - สร้าง script `scripts/seed_target_registry_uat_with_mappings.sql` ที่ระบุ template IDs และ scope modes สำหรับ UAT
  - USER ยืนยันว่า UAT สำหรับ Target Registry และ QR Asset History ทดสอบผ่านแล้ว
  - งานนี้ไม่ควรถูกนับเป็นงานค้างหรือรออนุมัติอีกต่อไป
- **ไฟล์ที่เกี่ยวข้อง:**
  - `scripts/seed_target_registry_uat_with_mappings.sql`
  - `docs/manuals/TARGET_REGISTRY_UAT_SEED_PLAN.md`

### 2. Cancel Document Source / Behavior Verification
- **สถานะ:** ✅ ตรวจสอบแล้ว / ปิดงานได้
- **อัปเดตล่าสุด:** 27 พฤษภาคม 2569
- **รายละเอียด:**
  - USER ยืนยันว่า flow การยกเลิกเอกสารทดสอบแล้วและใช้งานได้ดี
  - งานนี้ไม่ควรถูกนับเป็น blocker หรือ outstanding bug ใน backlog ปัจจุบัน
  - หากจะปรับปรุงเชิง refactor ภายหลัง ให้ถือเป็น optimization รอบถัดไป ไม่ใช่งานค้างเร่งด่วน
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/workflow.js`
  - `scripts/cancel_checklist_admin.js`

### 3. Complete Removal of Target Groups & Transition to per_type Mapping
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันเริ่ม:** 21 พฤษภาคม 2569
- **รายละเอียด:**
  - ลบตาราง `checklist_target_groups` และคอลัมน์ `target_group_id` ออกจากระบบ
  - เปลี่ยน mapping mode จาก `per_group` ไปเป็นแบบ dynamic `per_type`
  - อัปเดต Validation schema, Server Actions, และ UI Components หน้าจอ Target Registry และ Checklist Template Builder
  - ถอด group-based runtime paths ออกจาก action/UI contracts และคงการแมปเฉพาะ `per_target` + `per_type`
  - รันทดสอบระบบ `npm test` ผ่าน 100% (12/12 tests)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `supabase/migrations/20260521_remove_target_groups.sql`
  - `lib/checklistTemplateValidation.js`
  - `lib/procedurePlanValidation.js`
  - `app/actions/checklist-template.js`
  - `app/actions/target.js`
  - `app/actions/public-checklist.js`
  - `app/dashboard/settings/target-registry/TargetRegistryClient.js`
  - `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js`
  - `tests/target-registry.test.js`

---

## 📌 งานที่รอดำเนินการ (Pending)

### 1. Production Re-baseline Dev Export Artifact Completion
- **สถานะ:** ✅ Ready for Production Migration Mode Entry
- **วันเริ่ม:** 9 มิถุนายน 2569
- **อัปเดตล่าสุด:** 9 มิถุนายน 2569
- **รายละเอียด:**
  - สร้าง dev export artifact pack ใต้ `brain/production-rebaseline/dev-export/20260609-092859/` แล้ว ครอบคลุม `release_inventory`, row counts, selected-user pack, workflow/no-series pack, และ baseline table ส่วนหลัก
  - ยืนยันจาก live dev schema ว่า `workflow_configs.condition_key` มีอยู่จริง และ `approval_substitutes` ใช้ runtime columns ชุดใหม่แล้ว
  - พบ data drift ที่ต้องตัดสินใจก่อน execution จริง:
    - `checklist_targets.target_type` มีค่า `cctv_terminal_box` และ `network_teminal_box` แต่ `master_data.target_type` ใน approved scope ยังมีเพียง `cctv_terminal` และ `ac_server_room`
    - `checklist_templates.category` มีค่า `IT Infrastructure` และ `Security` แต่ `master_data.checklist_category` snapshot ปัจจุบันยังไม่มีสองค่านี้
    - `checklist_template_targets` มี row แบบ `per_type` ที่ `target_id = null` ได้ และต้องตีความตาม runtime contract ไม่ใช่ orphan โดยอัตโนมัติ
    - live dev `master_data` ยังไม่มี active rows สำหรับ `IT Infrastructure`, `Security`, `cctv_terminal_box`, และ `network_teminal_box`
  - ต้องตัดสินใจก่อนเข้าสู่ execution runbook ว่าจะ:
    - ขยาย master data scope ให้ตรง runtime ปัจจุบัน
    - หรือ normalize runtime data ให้กลับเข้าขอบเขตเดิม
    - และจะเติม missing `master_data` rows ใน dev ก่อนหรือใช้ supplement pack แยก
  - สร้าง decision pack [PRODUCTION_REBASELINE_SCOPE_DRIFT_DECISION_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SCOPE_DRIFT_DECISION_PACK.md) แล้ว โดย recommendation ปัจจุบันคือขยาย scope ให้ตรง baseline runtime data และยอมรับ `per_type` rows ที่ `target_id = null`
  - เนื่องจาก connector ฝั่ง dev ไม่อนุญาต `INSERT` (`read-only transaction`) จึงปิด gap ด้วย execution-grade supplement pack แทน:
    - `master_data_supplement.json`
    - `master_data_supplement.sql`
  - final verification แบบ `source + supplement` ผ่านแล้ว และบันทึก readiness ไว้ใน [PRODUCTION_REBASELINE_PRODUCTION_MODE_READINESS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_MODE_READINESS.md)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `brain/production-rebaseline/dev-export/20260609-092859/`
  - `docs/manuals/PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md`
  - `docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md`
  - `docs/manuals/PRODUCTION_REBASELINE_SCOPE_DRIFT_DECISION_PACK.md`
  - `docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_MODE_READINESS.md`

---

## 📝 หมายเหตุ (Notes)

- ระบบ Build ผ่านสำเร็จ (56 routes, 0 errors) ณ เวลา 15:54 น.
- Dev server กำลังทำงานอยู่ (`npm run dev`)
- หากมีงานใหม่ ให้เพิ่มลงในส่วน "งานที่รอดำเนินการ" แล้วอัปเดตสถานะเมื่อเริ่มทำ
