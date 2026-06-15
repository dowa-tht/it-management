# 🕒 ประวัติการเปลี่ยนแปลง (Changelog)

- **[15-Jun-2026 13:20] Production Checklist Cancel Fix**
  - แก้ [workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js) ใน `cancelDocument()` ให้เลิก hardcode `reported_by_id` และ reporter fields แบบ incident-only ใน query กลางของทุก document type
  - ปรับ query เป็น `.select('*')` เพื่อให้ checklist cancel ไม่อ้างคอลัมน์ที่ไม่มีใน `checklist_docs` และคง incident cancel policy เดิมไว้
  - เพิ่ม regression test ใน [incident-otp-flow.test.js](/C:/Users/Lenovo/dowa-it-system/tests/incident-otp-flow.test.js) และเตรียม release note [IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_CANCEL_FIX_2026_06_15.md](/C:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_CANCEL_FIX_2026_06_15.md)

- **[16:08] Public Approval Link One-Time Consume Session**
  - ปรับ workflow approval ให้การแจ้งเตือนผู้อนุมัติส่งออกเป็น `Public Approval Link` แบบอายุ 15 นาที และออก token ใหม่ทุกครั้งเมื่อมีการ resend
  - เพิ่มกติกา `consume-on-open` ที่หน้า [approve](/C:/Users/Lenovo/dowa-it-system/app/approve/page.js) และ [route.js](/C:/Users/Lenovo/dowa-it-system/app/api/approval/verify/route.js): ลิงก์จะถูกผูกกับ browser session แรกที่เปิดใช้งานทันที ถ้าเปิดซ้ำจาก session อื่นต้อง resend ใหม่เท่านั้น
  - เพิ่มปุ่ม `Resend Approval Link` บนหน้า [Incident Detail](/C:/Users/Lenovo/dowa-it-system/app/dashboard/incidents/[id]/page.js) สำหรับผู้ส่งเอกสารหรือผู้ดูแลในสถานะ `Pending Approval`
  - เพิ่ม logic revoke token เดิมเมื่อ approve/reject/cancel/reset workflow และเพิ่ม migration file [20260611_public_approval_consume_session.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260611_public_approval_consume_session.sql)
  - แก้ compatibility เพิ่มเติมใน [workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js) ให้ `approval_tokens.document_type` รองรับฐานที่ยังใช้ constraint เก่า (`incident_report` / `it_checklist`) เพื่อไม่ให้การสร้างลิงก์อนุมัติล้มก่อนส่งอีเมล
  - ตรวจสอบแล้วด้วย `npm run build` ผ่านสำเร็จ
- **[16:40] Public Approval Delivery Hardening & Docs Sync**
  - ขยายหน้า [approve](/C:/Users/Lenovo/dowa-it-system/app/approve/page.js) ให้แสดงรายละเอียด `Root Cause Analysis`, `Resolution`, และ `Corrective Action` ของ Incident เพื่อให้ผู้อนุมัติเห็นบริบทการแก้ไขครบก่อนตัดสินใจ
  - ปรับ layout หน้า public approve ให้เป็น responsive จริง รองรับ desktop, tablet, และ mobile ในหน้าเดียว โดยแยก card ข้อมูลเอกสารกับ action panel อย่างชัดเจน
  - แก้ one-time session cookie ใน [route.js](/C:/Users/Lenovo/dowa-it-system/app/api/approval/verify/route.js) ให้ใช้ path ระดับ `/` เพื่อไม่ให้เคสเปิดลิงก์ครั้งแรกแล้ว submit ต่อไม่ได้เพราะ browser ไม่ส่ง session cookie กลับ
  - ปรับ [workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js) ให้ `submitApprovalStepByPublicLink()` เรียก RPC `handle_approval_step` ตาม signature ที่ฐาน dev ใช้อยู่จริง ลดปัญหา `Could not find the function ... in the schema cache`
  - ยืนยัน UAT แล้วว่า public approve link เปิดใช้งานและอนุมัติได้ตามปกติหลังแก้ session + RPC compatibility

- **[13:42] Hide Incident Approval Flow Until Pending Approval**
  - ปรับหน้า Incident Detail ให้ซ่อนการ์ด `Approval Flow` จริงในสถานะ `Open` และ `In Progress` เพื่อไม่ให้ผู้ใช้เข้าใจผิดว่า workflow ถูกล็อกแล้วตั้งแต่ก่อนส่งอนุมัติ
  - เพิ่มข้อความ preview แทนในช่วงก่อน submit โดยแจ้งว่าระบบจะสร้างลำดับอนุมัติเมื่อเอกสารเข้าสู่ `Pending Approval` และแสดงจำนวน step ตาม config ปัจจุบันแบบสรุป
  - คงการแสดง `WorkflowProgressBar` เต็มรูปแบบไว้เฉพาะเมื่อเอกสารอยู่ในสถานะ `Pending Approval`, `Closed`, หรือ `Cancelled`

- **[14:33] Fix ReferenceError in QR Preview Modal Text Tab**
  - ดำเนินการแก้ไขข้อผิดพลาด `ReferenceError: disabled is not defined` ภายในคอมโพเนนต์ `FieldSelector` ในไฟล์ [TargetRegistryClient.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/target-registry/TargetRegistryClient.js)
  - โดยระบุค่า `disabled` ใน props destructuring พร้อมค่าเริ่มต้นเป็น `false` เพื่อป้องกันปัญหาหน้าจอค้างหรือ Crash เมื่อเปิดแท็บ "ข้อความ" (Text) ในกล่องออกแบบ QR Code
  - ดำเนินการทดสอบผ่าน Browser Subagent ด้วยการ Login บัญชี `test_admin@dowa.local` (และได้ทำการรีเซ็ตรหัสผ่านบัญชีทดสอบใน Database เป็น `ChangeMe1234!`) เปิดแท็บข้อความได้โดยไม่เกิดข้อผิดพลาดใดๆ
  - ยืนยันผลลัพธ์การแก้ไขโดยตรวจสอบผ่าน ESLint บนไฟล์ดังกล่าวผ่าน 100% ไม่มีข้อผิดพลาด
- **[13:15] Hide Linked Form from No. Series Page**
  - ดำเนินการซ่อนคอมโพเนนต์ dropdown "Linked Form" จากหน้าจอ No. Series Management ([app/dashboard/settings/no-series/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/no-series/page.js))
  - ปรับสไตล์ Grid ใน Header Settings จาก 4 คอลัมน์เป็น 3 คอลัมน์เพื่อให้เลย์เอาต์สวยงามสมดุล
  - แก้ไข bug ฟังก์ชันบันทึกข้อมูลส่วนหัว (Save Header) โดยเปลี่ยนจาก `showMessage` ที่ไม่มีอยู่จริงในไฟล์นี้ ให้เรียกใช้ `setMsg` เพื่อแสดงแจ้งเตือนสถานะสำเร็จ/ล้มเหลวได้อย่างถูกต้อง
  - รัน sanity test ด้วย `npm test` ผลลัพธ์ 34/34 ผ่านทั้งหมด
- **[11:05] login_logs Schema Fix & Historical Log Restoration**
  - วิเคราะห์และระบุข้อจำกัดของตาราง `public.login_logs` ที่ไม่มีคอลัมน์ `metadata` ส่งผลให้การ Insert ข้อมูล `action = 'login'` ที่มี metadata ล้มเหลวทั้งหมดในอดี트 (ขณะที่ Logout ทำงานปกติเพราะไม่มีการส่งฟิลด์นี้)
  - เพิ่มการตรวจสอบในคำสั่ง Insert/Select เพื่อสร้างคอลัมน์ `metadata` JSONB สำเร็จ
  - ดำเนินการย้ายประวัติการล็อกอินย้อนหลัง (Data Migration) จาก `auth.audit_log_entries` กลับมาเข้าตาราง `public.login_logs` เฉพาะผู้ใช้ที่ยังคงใช้งานอยู่ในระบบจริง (ป้องกัน Foreign Key Error จาก Deleted Users)
  - สร้างไฟล์ migration: [20260610_add_metadata_to_login_logs_and_restore_history.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260610_add_metadata_to_login_logs_and_restore_history.sql)
- **[10:10] Session Restore Login Logging & CHECK Constraint Alignment**
  - ค้นพบสาเหตุหลักของปัญหา Log การ Login ไม่บันทึกเนื่องจากติดกฎ **CHECK Constraint** ของฐานข้อมูลบนตาราง `login_logs` (ที่อนุญาตเฉพาะค่า `'login'` และ `'logout'`)
  - ปรับปรุงการบันทึกประวัติการ Login ทั้งหมด (Unified, SSO, Session Restore) ให้ใช้ Action เป็นตัวพิมพ์เล็ก `'login'` เพื่อให้ผ่านด่าน Constraint ของฐานข้อมูล และจัดเก็บข้อมูลแยกประเภทไว้ใน `metadata` แทน
  - เพิ่มการส่ง JWT Access Token จาก Client-side ไปใช้ดึงและตรวจสอบสิทธิ์ผู้ใช้ผ่าน Supabase admin ใน Server Action `recordSessionRestoreLog` เพื่อแก้ปัญหา Cookie ยังไม่ซิงค์บนเบราว์เซอร์ที่เปิดใหม่
  - ปรับปรุง [login.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/login.js), [page.js](file:///c:/Users/Lenovo/dowa-it-system/app/page.js), [layout.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/layout.js) และ [route.js](file:///c:/Users/Lenovo/dowa-it-system/app/auth/callback/route.js) ตามแผนการปรับปรุงโครงสร้างข้อมูลนี้
- **[09:28] Production Schema Synchronization & Alignment**
  - วิเคราะห์เปรียบเทียบ Schema Drift ระหว่างสภาพแวดล้อม Dev และ Production
  - สร้างสคริปต์ Sync Dev: [20260610_align_dev_schema_to_production.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260610_align_dev_schema_to_production.sql) เพื่อบันทึกคอลัมน์กู้คืนและอนุมัติที่คุณทำไว้บน Production ให้ตรงกันในเครื่อง
  - สร้างและแนะนำ SQL Patch สำหรับ Production: [20260610_production_schema_alignment_patch.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260610_production_schema_alignment_patch.sql) แบบปลอดภัย (Non-destructive) เพื่อแก้ไขตาราง/คอลัมน์และแคสต์ประเภทข้อมูลตามโค้ด Runtime
  - ตรวจสอบ Parity สำเร็จ และรันเทส `npm test` ทั้งหมดผ่าน 100% (34/34 tests passed)
- **[08:17] Create production migration hand-off document**
  - สร้างเอกสารส่งต่องาน [HANDOFF_PRODUCTION_STATUS_2026_06_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/HANDOFF_PRODUCTION_STATUS_2026_06_10.md)
  - สรุปเป้าหมาย สถานะ production ปัจจุบัน สิ่งที่ยืนยันแล้ว ความเสี่ยงค้าง และรายการงานที่ agent ถัดไปต้องทำต่อ
  - ย้าย changelog ของวันที่ 8-9 มิถุนายน 2569 ไป archive เพื่อให้ `CHANGELOG.md` เหลือเฉพาะของวันปัจจุบันตามกฎ Daily Log Shrinking
- **[08:17] Add reusable hand-off prompt document**
  - สร้าง [HANDOFF_PROMPT_PRODUCTION_STATUS_2026_06_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/HANDOFF_PROMPT_PRODUCTION_STATUS_2026_06_10.md)
  - จัดรูปแบบเป็น prompt พร้อมใช้สำหรับ agent ถัดไป โดยระบุ environment, เป้าหมาย, guardrails, ลำดับการอ่านเอกสาร, runtime evidence files, และ task continuation list

## 📦 บันทึกย้อนหลัง (Archives)

### มิถุนายน 2569 (June 2026)
- [CHANGELOG_2026_06_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_09.md)
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
*อัปเดตล่าสุด: 11-Jun-2026 16:40*
