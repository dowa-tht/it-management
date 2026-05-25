# 📋 รายการงาน (Task Tracker)

**อัปเดตล่าสุด:** 25 พฤษภาคม 2569 (15:05 น.)

---

## ✅ งานที่เสร็จสิ้นแล้ว (Completed)

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
  - สร้าง Cancel Dialog สำหรับ Checklist (ระบุเหตุผล → ยืนยันโดย Creator/Admin)
  - สร้าง Cancel Dialog สำหรับ Incident (ระบุเหตุผล → ยืนยันด้วย PIN/OTP จาก Reporter)
  - สร้าง Database Migration เพิ่ม columns `cancelled_at`, `cancelled_by`, `cancel_reason`
  - อัปเดต Detail Pages ให้ซ่อนการกระทำเมื่อสถานะ Cancelled
  - รัน `npm test` ผ่าน 100% (12/12 tests passed)
- **ไฟล์ที่เกี่ยวข้อ:**
  - `app/actions/workflow.js`
  - `components/workflow/WorkflowActionBar.js`
  - `app/dashboard/checklist/[id]/page.js`
  - `app/dashboard/incidents/[id]/page.js`
  - `supabase/migrations/20260525_cancel_document_support.sql`
  - `docs/history/CHANGELOG.md`
  - `docs/standards/SYSTEM_ARCHITECTURE_MAP.md`

### 16. Workflow Settings - Filter Users by Selected Role
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 25 พฤษภาคม 2569
- **รายละเอียด:**
  - แก้ไข `dashboard/settings/workflow/page.js` ให้กรองรายชื่อผู้ใช้ในช่อง "ระบุผู้อนุมัติเฉพาะเจาะจง" ตาม Role ที่เลือก
  - Dynamic Roles (reporter, creator) แสดงทุก user, System Roles กรองเฉพาะ user ที่มี role ตรงกัน
  - เมื่อเปลี่ยน Role จะ clear approver ที่ไม่ตรงกันออกโดยอัตโนมัติ
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/workflow/page.js`

### 15. Procedure Plan Editor - Label Change
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 25 พฤษภาคม 2569
- **รายละเอียด:**
  - เปลี่ยน label "Instruction" เป็น "ขั้นตอนการดำเนินการ" ใน `ProcedurePlanEditorClient.js`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`

### 14. Mobile Photo Verification & Image Compression Audit
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 20 พฤษภาคม 2569
- **รายละเอียด:**
  - ทำการตรวจสอบและจำลอง UAT การถ่ายภาพและอัปโหลดบนมือถือเครื่องจริง
  - วิเคราะห์และตรวจสอบว่าระบบปัจจุบันมีการจำกัดและลดขนาดไฟล์ภาพ (Compression/Resizing) เพื่อลดขนาด base64 และประหยัดเนื้อที่การบันทึกลง OneDrive (บีบอัดรูปภาพลงขนาดสูงสุด 1280px ก่อนส่ง)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/checklist/[id]/page.js`
  - `docs/history/CHANGELOG.md`
  - `docs/history/USER_TASKS.md`

### 13. Separation of Incident Creator & Requester, and Workflow Settings UX & Guide Hardening
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 19 พฤษภาคม 2569
- **รายละเอียด:**
  - แยกฟิลด์และบทบาทระหว่างผู้แจ้งเหตุ (Reporter) และผู้สร้างใบงาน (Creator) ในโมดูล Incident
  - อัปเกรดระบบ Workflow Engine และ Actions ให้รองรับ Dynamic Role `creator` และ `reporter`
  - ปรับปรุง Workflow Settings UI ให้แสดงประเภทบทบาทชัดเจน เช่น `(System Role)` และ `(Dynamic Role)`
  - ปรับปรุงเอกสารคู่มือตั้งค่า Workflow (Guide Fallback) ในระบบให้ครอบคลุมเงื่อนไขการจัดเส้นทาง (Checklist & Incident) และกฎการอนุมัติอัตโนมัติ (Auto-Approval) พร้อมการบันทึก Audit Logs
  - ลบหน้าจอระบบตั้งค่าการอนุมัติเดิม (Legacy Approval Flows) ที่ไม่ได้ใช้งานออกจากระบบทั้งหมด
  - รันการทดสอบระบบ (`npm test`) และผ่านการตรวจสอบ 100% (9/9 tests passed)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/incidents.js`
  - `app/actions/workflow.js`
  - `app/dashboard/settings/workflow/page.js`
  - `docs/history/CHANGELOG.md`
  - `docs/history/USER_TASKS.md`

### 11. Verification and Audit for Checklist Duplicate Prevention & DB Read-Only Status Analysis
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 18 พฤษภาคม 2569
- **รายละเอียด:**
  - ยืนยันความถูกต้องของไฟล์ [app/dashboard/checklist/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js) ป้องกัน duplicate declaration ของ `selectedTemplates` และมั่นใจว่าไม่มี compile/runtime crash จากการเรียกซ้ำ
  - วิเคราะห์โครงสร้าง Supabase SQL database และทดสอบ SQL Migration สำหรับ RLS และการอนุมัติ Checklist
  - ระบุสาเหตุที่ Remote Postgres backend เข้าสู่สถานะ Read-only transaction mode และให้แนวทางการแก้ไขที่ชัดเจนสำหรับ Dynamic SQL schema/DDL updates
  - รันคำสั่งทดสอบระบบ `npm test` ผลการทดสอบผ่าน 100% (8/8 tests passed)
- **ไฟล์ที่เกี่ยวข้อง:**
  - [app/dashboard/checklist/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js)
  - [docs/history/CHANGELOG.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/CHANGELOG.md)
  - [docs/history/USER_TASKS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/USER_TASKS.md)

### 12. Harden Asset History Architecture หลังจบ Target Registry Foundation
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 15 พฤษภาคม 2569
- **รายละเอียด:**
  - refactor หน้า `app/dashboard/checklist/targets/[id]/page.js` ให้เลิก query Supabase ตรงจาก Client Component
  - ย้าย data loading ไปเป็น Server Action `getTargetAssetHistory()` ใน `app/actions/target.js`
  - ปรับ `app/api/qr/lookup/route.js` ให้มี 400 / 404 / 500 branches ชัดเจนมากขึ้น
  - อัปเดต automated tests ให้ครอบคลุม asset history loader และ QR route source guards แล้ว
- **ไฟล์ที่เกี่ยวข้อง:**
  - [app/dashboard/checklist/targets/[targetId]/points/[pointId]/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/targets/[targetId]/points/[pointId]/page.js)
  - [app/actions/target.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/target.js)
  - [app/api/qr/lookup/route.js](file:///c:/Users/Lenovo/dowa-it-system/app/api/qr/lookup/route.js)

### 8. Settings Module UI/UX Stabilization (Checklist Master Data)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 15 พฤษภาคม 2569
- **รายละเอียด:**
  - เพิ่ม Preview Modal (👁) ในหน้า Checklist Master Data ให้สามารถดูรายละเอียด Template ได้แบบ Read-only
  - ถอดปุ่ม Clone และ logic ที่เกี่ยวข้องออกตามความต้องการของ USER เพื่อลดความสับสน
  - แก้ไขปัญหา Error Message แสดงผลเป็น `[object Object]` ในหน้า Builder โดยการใช้ Zod Error Flattening
  - ตรวจสอบและแก้ไขตำแหน่ง Error Hint ของฟิลด์ Measurement (Min/Max) ใน `TemplateForm.js`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/_components/MasterDataScope.js` — เพิ่ม Preview Modal & ถอดปุ่ม Clone
  - `lib/checklistTemplateValidation.js` — Refactor `validateChecklistTemplate()` ให้ flatten errors
  - `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` — แก้ไข UI hints
  - `package.json` — เพิ่ม `predev` script เพื่อความปลอดภัยในการรัน server

### 9. Checklist Point History & Photo UI Hardening
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 15 พฤษภาคม 2569
- **รายละเอียด:**
  - **Point-Level Traceability:** เปลี่ยนระบบบันทึกหลักฐานภาพจาก index-based เป็น stable point-identity (Snapshot-First) โดยใช้ `photos_by_point` และ `photo_meta_by_point`
  - **Timeline UI:** สร้างหน้า `/dashboard/checklist/targets/[targetId]/points/[pointId]` แสดงประวัติการตรวจรายจุดแบบ Timeline พร้อมพิกัด GPS และสถานะ Data Source (Verified vs Legacy)
  - **QR Deep-Linking:** พัฒนา `resolveChecklistQr` รองรับการสแกน QR เพื่อเข้าถึงประวัติ Asset (`TargetQR`) หรือประวัติจุดตรวจเฉพาะจุด (`TargetQR#PointID`) ทันที
  - **Dual-Write Architecture:** คงระบบเดิมไว้ควบคู่กับระบบใหม่ (Dual-Write) และใช้ Fallback Logic ในการอ่านข้อมูลเก่า เพื่อความต่อเนื่องของข้อมูล UAT
  - **UX Integration:** เพิ่มปุ่ม "Scan / Search QR" ในหน้าหลัก Checklist เพื่อเป็นทางลัดสำหรับเจ้าหน้าที่หน้างาน
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/target.js` — เพิ่ม `getTargetPointHistory` และ `resolveChecklistQr`
  - `app/dashboard/checklist/targets/[targetId]/points/[pointId]/page.js` — หน้า UI ประวัติรายจุด
  - `app/dashboard/checklist/[id]/page.js` — ปรับ Logic การบันทึกภาพแบบ Dual-Write
  - `app/dashboard/checklist/page.js` — เพิ่มปุ่ม Scan QR และ UI resolution
  - `docs/standards/QR_ASSET_HISTORY.md` — อัปเดตมาตรฐาน QR resolution

### 10. Agent Mandatory Workflow (npm test requirement)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 15 พฤษภาคม 2569
- **รายละเอียด:**
  - อัปเดต `AGENTS.md` เพิ่มกฎ **[PRE-DELIVERY TEST]** ให้ AI ต้องรัน `npm test` และผ่าน 100% ก่อนส่งงานเสมอ
  - แก้ไขปัญหา Dev Server ค้าง/Error `slug name mismatch` โดยการลบโฟลเดอร์ `app/dashboard/checklist/targets/[id]` ที่ซ้ำซ้อนกับ `[targetId]` ออก
  - ยืนยันความเสถียรของระบบด้วยการรัน `npm test` (Pass 7/7)
- **ไฟล์ที่เกี่ยวข้อง:**
  - `AGENTS.md` — เพิ่มกฎ Pre-delivery test
  - `app/dashboard/checklist/targets/[id]` — ลบออกเพื่อแก้ route conflict


### 1. Incident Accept/Dispatch Audit-Safe Workflow
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:**
  - `it_staff` สามารถกด Accept รับงานเป็นของตนเองได้เท่านั้น
  - `admin` สามารถ Dispatch มอบหมายงานให้ `it_staff` ได้ (ต้องเลือกผู้รับผิดชอบก่อน)
  - แยก Audit Log ระหว่าง "รับเรื่อง (Acknowledge)" และ "มอบหมายงาน (Dispatch)"
  - Server-side validation ตรวจสอบ role, active status, severity และ concurrency guard
  - UI ซ่อนปุ่ม Accept/Dispatch จาก role ที่ไม่มีสิทธิ์ (employee, auditor)
  - Assignee indicator ในหน้า Account Management เป็น read-only อ้างอิงจาก role `it_staff`
  - อัปเดตเอกสารมาตรฐาน `INCIDENT_MANAGEMENT.md` และ `PERMISSIONS.md`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/incidents.js` — `acknowledgeIncident()` พร้อม role validation
  - `components/workflow/WorkflowActionBar.js` — `canAcknowledge`, `acknowledgeLabel` props
  - `app/dashboard/incidents/[id]/page.js` — `AcknowledgeDialog` แยก flow ตาม role
  - `app/dashboard/settings/users/page.js` — Assignee read-only derived from role

### 2. แก้ไข revalidatePath Error ใน Admin Actions
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** เพิ่ม import `revalidatePath` จาก `next/cache` ใน `app/actions/admin.js` เพื่อแก้ runtime error หลัง `updateAdminUser()`

### 3. ลบ Dev Cache และ Restart Server
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** ลบ `.next` และ restart dev server เพื่อแก้ 404 error ที่ `/dashboard/settings/no-series`

### 4. ตรวจสอบและอัปเดต User Role
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** อัปเดต `natthawut@dowa-tht.co.th` เป็น role `it_staff` และ `can_be_assignee = true` สำเร็จ

### 5. สร้าง RLS Migration Script
- **สถานะ:** ✅ เสร็จสมบูรณ์ (ยังไม่ได้ apply กับ production)
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** สร้างไฟล์ `supabase/migrations/add_rls_policies.sql` สำหรับเปิด RLS บน 18 ตารางที่ยังปิดอยู่

### 6. อัปเดต Project Agent Rules
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
### 7. Settings Audit Remediation (TASK-001 ถึง TASK-003)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - `TASK-001` เสริม Guide และ Content ให้ครบทุกหน้าใน Settings ผ่าน `MasterDataScope.js` และ `Holidays` page
  - `TASK-002` ปรับแต่ง CSS Table Wrapper สำหรับ Master Data และ Checklist เพื่อรองรับ Mobile horizontal scroll
  - `TASK-003` ตรวจสอบ RLS Policy ยืนยันความปลอดภัยของตาราง `holidays` และ `checklist_procedure_plans`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/_components/MasterDataScope.js`
  - `app/dashboard/settings/holidays/page.js`
  - `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md`

### 8. ปรับหน้า Holidays เป็นปฏิทินรายปี/รายเดือน
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - เปลี่ยนมุมมองจากตารางเป็นปฏิทิน 2 โหมด: Month View และ Year View
  - เพิ่ม Year selector และสรุปวันหยุดรายเดือนในโหมดรายปี
  - เพิ่ม Month calendar ที่แสดงวันหยุดภายในเดือน พร้อมกดวันที่เพื่อ prefill ฟอร์มเพิ่มวันหยุด
  - ผูกสถานะวันทำงาน (Work/Off) จาก `system_settings.working_hours.work_days`
  - คงฟังก์ชัน Add/Edit/Delete และ Import CSV เดิมไว้ในมุมมองใหม่
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/holidays/page.js`

### 9. ยกระดับดีไซน์หน้า System Setup Holidays Calendar
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - ปรับ header และ action dock ให้ใช้ภาษาดีไซน์เดียวกับ Settings Design System ชัดเจนขึ้น
  - เพิ่ม summary cards, annual insights, legend และ visual hierarchy ใหม่เพื่อให้สแกนข้อมูลเร็วขึ้น
  - ปรับ month calendar และ year cards ให้มี gradient, status badge, selected-date focus และ card depth ที่พรีเมียมขึ้น
  - คง workflow เดิมสำหรับ Add/Edit/Delete/Import CSV และ Guide Modal โดยไม่แก้ logic ข้อมูลต้นทาง
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/holidays/page.js`

### 10. ปรับปรุง UI/UX หน้า Working Hours & SLA
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - ปรับ page shell, header และ action dock ของหน้า `Working Hours & SLA` ให้สอดคล้องกับ Settings Design System
  - เพิ่ม summary cards สำหรับ Daily Hours, Working Days, Weekly Capacity และ Off Days เพื่อให้เห็นผลของ config ทันที
  - เพิ่ม SLA targets panel, policy snapshot และ explanation card เพื่อให้ผู้ใช้เข้าใจความเชื่อมโยงระหว่างเวลาทำงานกับ KPI มากขึ้น
  - ปรับ working day selector, time inputs และ guide modal ให้มี hierarchy และ responsive behavior ที่พรีเมียมขึ้น โดยคง logic การบันทึก `working_hours` และการอ่าน `sla_limits` เดิมไว้
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/working-hours/page.js`

### 11. ปรับแนวตั้ง UI/UX ของ Incident Master Data, Checklist Categories และ Account Management
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - ปรับ responsive stack ของ `MasterDataScope` ให้หน้า `Incident Master Data` และ `Checklist Categories` ยุบแนวตั้งได้เป็นระเบียบมากขึ้น ทั้ง header, sidebar selector, search/filter, add form และ table wrapper
  - ปรับ `Account Management` ให้ฟอร์มสร้างผู้ใช้, role-derived assignment section, dialog header/tabs และ security blocks แสดงผลในแนวตั้งได้สวยขึ้นบนจอ portrait/mobile
  - เก็บ lint ของ effect hooks ในสองไฟล์ให้ผ่านกฎใหม่ของโปรเจกต์โดยไม่เปลี่ยน business logic
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/_components/MasterDataScope.js`
  - `app/dashboard/settings/users/page.js`

### 12. จัดทำแผนพัฒนา Checklist Template Master และ Asset History
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - ตรวจสอบโค้ดจริงของ `Checklist Master`, `Procedure Plans` และ `Checklist Execution Engine` เพื่อยืนยันว่า `template_config` และ `_snapshot` รองรับการขยายสถาปัตยกรรมได้
  - จัดทำแผนภาษาไทยสำหรับยกระดับ `Checklist Template Master` ให้เป็น Template Builder, เพิ่ม `Procedure Plan Editor` และออกแบบ `Target Registry + QR Asset History`
  - ระบุชัดเจนว่า Template ใดเหมาะกับ `Asset History` และวาง use case เริ่มต้นสำหรับ `CCTV Terminal Box`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md`
  - `docs/INDEX.md`

### 13. ดำเนินการ Photo_Evidence_Geolocation_003 Optional Geolocation for Photo Evidence
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - ปรับ `PhotoTemplate` ในหน้า Checklist Detail ให้มี switch `Attach Location` แบบ optional และขอสิทธิ์ geolocation ตอนอัปโหลดรูปเมื่อเปิดใช้งาน
  - เก็บ metadata พิกัดแบบ optional ลง `checklist_items.template_data.photo_meta` คู่กับหลักฐานภาพ โดยไม่สร้าง data structure ลอยที่ไม่ได้ถูกใช้ในระบบจริง
  - เพิ่ม badge แสดงสถานะพิกัดบนภาพ และอัปเดตเอกสารมาตรฐาน/แผนให้สะท้อนโครงสร้างข้อมูลจริง
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/checklist/[id]/page.js`
  - `docs/standards/DOCUMENT_MAPPING_STANDARD.md`
  - `docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md`

### 14. พัฒนา Checklist Template Builder แบบ Standalone
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - สร้าง route ใหม่ `/dashboard/settings/checklist-template-builder` สำหรับตั้งค่า Template เชิงลึกของ `checklist_templates`
  - เพิ่ม server-side validation ของ `template_config` สำหรับ `T0-T5` และบังคับตรวจสิทธิ์ `admin` ก่อนบันทึก
  - เพิ่ม live preview, Template Library search และปุ่มเชื่อมจากหน้า `Checklist Master Data` ไปยัง Builder
  - อัปเดตมาตรฐาน `DOCUMENT_MAPPING_STANDARD.md` ให้ระบุ schema ขั้นต่ำของ `template_config`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/checklist-template.js`
  - `app/dashboard/settings/checklist-template-builder/page.js`
  - `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js`
  - `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js`
  - `app/dashboard/settings/checklist-template-builder/components/TemplatePreview.js`
  - `lib/checklistTemplateValidation.js`
  - `app/dashboard/settings/_components/MasterDataScope.js`
  - `docs/standards/DOCUMENT_MAPPING_STANDARD.md`

### 15. พัฒนา Procedure Plan Editor แบบ Standalone
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - สร้าง route ใหม่ `/dashboard/settings/procedure-plan-editor` สำหรับแก้ `checklist_procedure_plans` แบบรายขั้นตอน
  - เพิ่ม server-side validation ของ `plan_name` และ `steps.rows[]` พร้อมรองรับ `step_type`, `required`, และ `evidence_rule`
  - เพิ่ม reorder, add/remove step, execution preview และเชื่อมปุ่มเข้า editor จากหน้า `Checklist Master Data`
  - ปรับ `ProcedureTemplate` ในหน้า Checklist Detail ให้ render step object จาก `title`/`instruction` ได้ตรงกับ schema ใหม่
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/procedure-plan.js`
  - `app/dashboard/settings/procedure-plan-editor/page.js`
  - `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`
  - `lib/procedurePlanValidation.js`
  - `app/dashboard/settings/_components/MasterDataScope.js`
  - `app/dashboard/checklist/[id]/page.js`
  - `docs/standards/DOCUMENT_MAPPING_STANDARD.md`

### 16. ปรับ Layout ของ Template Builder และ Procedure Plan Editor
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - ปรับ shell ของสองหน้าใหม่อีกครั้งให้เลิกใช้ 3 คอลัมน์ในการทำงานจริง และล็อก desktop เป็น 2-pane (sidebar + editor) เพื่อคืนพื้นที่ให้ฟอร์มหลัก
  - ย้าย preview ทั้งสองหน้าไปอยู่ใต้ editor ฝั่งขวาแทนการกินคอลัมน์แยก ทำให้หน้า `Procedure Plan Editor` ไม่ถูกบีบจน step cards ยาวผิดสัดส่วน
  - ปรับ body layer เพิ่มเติมทั้ง `label`, `input`, `textarea`, `toggle`, `step action buttons`, sidebar cards และ preview typography เพื่อให้ spacing และ visual weight สมดุลกับ header ที่แก้ไปก่อนหน้า
  - ปรับ `Procedure Plan Editor` เพิ่มอีกชั้นให้ใช้ `step list + detail editor` แทนการเปิดฟอร์มทุก step พร้อมกัน เพื่อลด vertical depth และให้ UX สอดคล้องกับมาตรฐาน Workflow Builder
  - เก็บ spacing pass ครบทุก section เพิ่มเติม โดยขยาย inner padding และ line-height ของ preview/snapshot/sidebar items เพื่อไม่ให้ text ดูชิด border หรือ card ดูติดกัน
  - ปรับ `TemplatePreview` เพิ่ม explicit container spacing ภายใน `Live Preview` อีกชั้น โดยแยก copy/panel layout และขยาย padding ของ preview lines เพื่อแก้อาการ object ชิดขอบในก้อน preview ของ `Checklist Template Builder`
  - ปรับ `Standards Snapshot` ของ `Checklist Template Builder` เพิ่ม outer shell และขยาย gap/padding ของ snapshot cards เพื่อให้ก้อนมาตรฐานไม่ดูติดกันหรือแน่นเกินไป
  - ตัด outer shell ชั้นในของ `Standards Snapshot` ออกอีกครั้งหลังตรวจจากภาพจริง เพื่อแก้อาการกล่องซ้อน 2 ชั้นและคง spacing ผ่าน card หลักเพียงชั้นเดียว
  - เพิ่ม inner frame ครอบ heading กับ snapshot grid ของ `Standards Snapshot` เพื่อแก้อาการ section title และเนื้อหากินขอบของ card หลักในโหมด create/edit
  - ปรับ polish ของ `Live Preview` และ `Standards Snapshot` ใน `Checklist Template Builder` ให้เบาลง โดยตัดกรอบ hero ชั้นในของ preview และลด snapshot cards เป็นแถบข้อมูลที่อ่านง่ายกว่าเดิม
  - ปรับ `Live Preview` และ `Standards Snapshot` ใน `Checklist Template Builder` ให้กลับมาใช้ pattern เดียวกับ `Template behavior` ได้แก่ outer card, section title, config-box, และ inner item cards ที่คุม padding/gap ชัดเจน เพื่อแก้ดีไซน์ที่แตกชุดและดูเละในโหมด create/edit
  - แก้ `Standards Snapshot` เพิ่มเติมหลังตรวจจาก screenshot วันที่ 15 พฤษภาคม 2569 โดยเปลี่ยน outer section จาก Tailwind `p-7` เป็น `.template-builder-snapshot-card` ที่กำหนด padding/border/shadow ด้วย CSS explicit เพื่อแก้อาการ heading และ content กินขอบ card
  - แก้ระยะห่างระหว่าง `General` และ `Type` ของ `TemplateForm` หลังตรวจจาก screenshot วันที่ 15 พฤษภาคม 2569 โดยเปลี่ยน wrapper จาก Tailwind `space-y-6` เป็น `.template-form-stack` ที่ใช้ CSS explicit `display: grid; gap: 28px`
  - สร้างมาตรฐาน `docs/standards/UI_LAYOUT_SPACING_REMEDIATION.md` เพื่อใช้เป็นคู่มือถาวรสำหรับตรวจ root cause และแก้ปัญหา layout ชิดขอบ, card/object ติดกัน, spacing หาย, card ซ้อน และ Tailwind utility ไม่เสถียร
  - ปรับ `Execution Preview` ของ `Procedure Plan Editor` เพิ่ม preview shell และขยาย spacing ของ step cards/title/meta/instruction เพื่อให้รายการตัวอย่างไม่ชิดขอบและอ่านง่ายขึ้น
  - ปรับ `Checklist Master Data` ให้แยก flow ระหว่าง `create` กับ `edit` ของ `Checklist Template Builder` ชัดเจนขึ้น โดยปุ่ม header ใช้สำหรับสร้างใหม่อย่างเดียว, ปุ่ม `✏️` รายการพาเข้า focused edit route และยกเลิก quick-create inline ของ `Checklist Master`
  - แก้ปุ่ม `กลับหน้า Master Data` ให้ย้อนกลับไปยังแท็บ `Checklist Master` และ `Procedure Plans` ได้ตรงหน้า
  - ปรับ `MasterDataScope` ให้รองรับ `type` query แม้หน้า `Checklist Master Data` จะถูกเปิดด้วย `forcedGroup`
  - ตรวจสอบและอัปเดต `IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md` ให้แยกสถานะล่าสุดชัดเจนว่า `Template Builder`, `Procedure Plan Editor`, optional photo geolocation และ layout hardening เสร็จแล้ว ส่วน `Target Registry + QR Asset History` ยังเป็นงาน pending phase ถัดไป
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js`
  - `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`
  - `app/dashboard/settings/_components/MasterDataScope.js`

### 17. จัดทำแผน Target Registry และ QR Asset History
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - จัดทำเอกสารแผนลงรายละเอียด data model, routes, query flow, pseudocode และลำดับการพัฒนา สำหรับ `Target Registry + QR Asset History`
  - อัปเดต `docs/INDEX.md` ให้เชื่อมโยงเอกสารแผนฉบับใหม่
- **ไฟล์ที่เกี่ยวข้อง:**
  - `docs/history/IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md`
  - `docs/INDEX.md`

---

## 🔄 งานที่กำลังดำเนินการ (In Progress)

### 1. เตรียมข้อมูล UAT สำหรับ Target Registry / QR Asset History
- **สถานะ:** 🔄 กำลังดำเนินการ (เสนอแผน Implementation Plan สำหรับการ seeding ข้อมูลแล้ว)
- **วันเริ่ม:** 20 พฤษภาคม 2569
- **รายละเอียด:**
  - เตรียมแผนลงรายละเอียด database seeding และ template mapping strategy
  - สร้าง script `scripts/seed_target_registry_uat_with_mappings.sql` ที่ระบุ template IDs และ scope modes สำหรับ UAT
  - รอ USER อนุมัติแผนก่อนเริ่ม execute จริง
- **ไฟล์ที่เกี่ยวข้อง:**
  - `scripts/seed_target_registry_uat_with_mappings.sql`
  - `docs/history/USER_TASKS.md`

### 2. Complete Removal of Target Groups & Transition to per_type Mapping
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

### 2. วางโครงสร้าง Target Registry และ QR Asset History
- **สถานะ:** ✅ เสร็จแล้วในส่วน foundation / migration / tests
- **วันที่เพิ่ม:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - ออกแบบ/พัฒนา target master สำหรับ asset เช่น `CCTV Terminal Box`
  - รองรับ QR scan และประวัติการตรวจย้อนหลังราย asset
  - apply migration สำเร็จและยืนยัน tables / columns / indexes แล้ว
  - เพิ่ม automated tests สำหรับ validation และ QR route guard baseline แล้ว
  - เอกสารแผนรายละเอียด: `docs/history/IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md`

---

## 📝 หมายเหตุ (Notes)

- ระบบ Build ผ่านสำเร็จ (56 routes, 0 errors) ณ เวลา 15:54 น.
- Dev server กำลังทำงานอยู่ (`npm run dev`)
- หากมีงานใหม่ ให้เพิ่มลงในส่วน "งานที่รอดำเนินการ" แล้วอัปเดตสถานะเมื่อเริ่มทำ
