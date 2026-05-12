# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## [2026-05-12 15:02] - Incident Reject Reason Visibility
- **Evidence Check**: ตรวจสอบเอกสาร `DTT-INC-2605-013` พบว่าเอกสารอยู่สถานะ `In Progress` / `workflow_status = draft` หลัง Reject ถูกต้อง และเหตุผล Reject ถูกบันทึกเป็น `ทดสอบการ Reject` ทั้งใน `system_audit_logs.details` และ `document_approvals.comment`
- **UI Improvement**: เพิ่มกล่องแจ้งเตือนในส่วน Workflow Progress ของหน้า Incident เมื่อพบประวัติ Reject เพื่อแสดงว่าเอกสารถูกตีกลับแล้ว พร้อมเหตุผล ผู้ดำเนินการ และเวลาที่ Reject
- **Structure Safety**: เพิ่มเฉพาะ informational banner ภายใน Card เดิม ไม่เปลี่ยน Workflow Status Logic, Action Bar หรือโครงสร้างหน้า Incident หลัก
- **Verification**: อ่านไฟล์จริงหลังแก้ไขแล้ว และ `npm run build` ผ่านสำเร็จ

---

## [2026-05-12 14:23] - Remote Approval Submit PIN Identity Fix
- **Root Cause**: Test PIN ผ่านเพราะ `diagnoseApprovalPin()` Sync และอ่าน `approver_id` ใหม่จาก DB ก่อนตรวจ แต่ตอนกดอนุมัติจริง `submitApprovalStep()` ยังอาจใช้ค่า `overrideApproverId`/Client state ที่เก่าก่อน Sync ทำให้ตรวจ PIN กับ identity ไม่ตรงกัน
- **Server-side Fix**: ปรับ `submitApprovalStep()` ให้เรียก `syncDynamicWorkflowApprovers()` ก่อนอ่าน Step และกำหนด `actualApproverId` จาก `currentStep.approver_id` ฝั่ง Server เป็นลำดับแรก ไม่พึ่ง Client state เป็นหลัก
- **Verification**: อ่านไฟล์จริงยืนยัน Logic ที่ `app/actions/workflow.js` แล้ว และ `npm run build` ผ่านสำเร็จ

---

## [2026-05-12 13:55] - PIN Diagnostic Field Selection Fix
- **Bug Fix**: แก้ `syncDynamicWorkflowApprovers()` ที่ Query คอลัมน์ `created_by` จากตาราง `incidents` ทั้งที่ตารางจริงไม่มีคอลัมน์นี้ ทำให้หน้าทดสอบ PIN แสดง Error `column incidents.created_by does not exist`
- **Workflow Fix**: จำกัด Dynamic Reporter Approver Mapping ให้ใช้ `reported_by_id` เท่านั้นตามมาตรฐาน Reporter Identity และไม่ fallback ไป field ที่ไม่มีใน schema
- **Verification**: ตรวจสอบไฟล์จริงหลังแก้ไขแล้ว และ `npm run build` ผ่านสำเร็จ

---

## [2026-05-12 13:47] - Remote Approval Reporter PIN Diagnostic Fix
- **Root Cause**: ตรวจพบเอกสาร `DTT-INC-2605-012` มี Reporter Approval Step (`step_order = 2`, `role_required = reporter`) ที่ `document_approvals.approver_id` เป็น `NULL` ทำให้ Remote Approval แสดงชื่อ Reporter ได้จาก UI fallback แต่ฝั่ง Submit/Verify ไม่มีตัวตนผู้อนุมัติที่แน่นอนใน Step
- **Workflow Fix**: ปรับ Incident Remote Approval ให้ส่ง `reported_by_id` เป็น `overrideApproverId` เมื่อ Step Reporter ยังไม่มี `approver_id` เพื่อให้ PIN ถูกตรวจเทียบกับเจ้าของเอกสาร/ผู้แจ้งจริงตามมาตรฐาน Workflow
- **Diagnostic UI**: เพิ่มปุ่ม “ทดสอบ PIN ก่อนอนุมัติ” ใน `UnifiedApprovalModal` โดยเรียก Server Action ที่ Sync Dynamic Approver แล้วตรวจ PIN กับผู้อนุมัติจริง พร้อมแสดงผลว่าถูก/ผิดโดยไม่บันทึกการอนุมัติ
- **Verification**: `npm run build` ผ่านสำเร็จ; `npm run lint` ยังไม่ผ่านจากปัญหาเดิมในไฟล์อื่นของโปรเจกต์ (เช่น `app/approve/page.js`, `app/dashboard/backup/page.js`, `app/page.js`) ไม่ใช่จากไฟล์ที่แก้ในงานนี้

---

## [2026-05-12 11:39] - Incident Resolve Submit `finalAutoApprove` Fix
- **Bug Fix**: แก้ `submitRequest()` ที่อ้างอิงตัวแปร `finalAutoApprove` โดยไม่ได้ประกาศ ทำให้เกิด Error ระหว่าง IT กดส่งงานแก้ไขปัญหาเพื่ออนุมัติ
- **Workflow Stability**: กำหนด `finalAutoApprove` จากผลลัพธ์ `autoApproved` ของ `generateWorkflowSteps()` เพื่อให้ Cross-module Sync และ Email Notification ใช้สถานะสุดท้ายเดียวกัน
- **Incident Flow**: รองรับ Flow IT สร้าง/รับงาน/Resolve/ส่งอนุมัติ โดยไม่ติด `finalAutoApprove is not defined`

---

## [2026-05-12 11:12] - Approval PIN Identity Verification Fix
- **Approval Identity Fix**: ปรับ Incident และ Checklist Approval ให้ส่ง `currentStep.approver_id` เข้า `submitApprovalStep()` เสมอเมื่อ Step ระบุผู้อนุมัติเจาะจง เพื่อให้ Server ตรวจ PIN กับเจ้าของลายเซ็นที่เอกสารต้องการจริง
- **Remote/Direct Safety**: Server Action ยังใช้เงื่อนไขเดิมในการแยก Direct Approval และ Remote Approval โดยถ้า `approver_id` ตรงกับ Session User จะเป็น Direct หากไม่ตรงจะบังคับ PIN แบบ Remote
- **Root Cause**: Modal แสดงชื่อผู้อนุมัติถูกแล้ว แต่ฝั่ง Submit อาจไม่ได้ส่ง `approver_id` ไปตรวจ ทำให้ PIN ถูกตรวจผิด identity ในบางเส้นทาง

---

## [2026-05-12 11:00] - Remote Approval Approver Identity Display
- **Remote Approval UX**: เพิ่มการแสดงชื่อและอีเมลของผู้ที่เอกสารต้องการลายเซ็น/PIN ใน Header ของ `UnifiedApprovalModal`
- **Identity Source**: ปรับ Incident และ Checklist Detail ให้ส่ง `currentStep.user_profiles.full_name` และ `currentStep.user_profiles.email` เข้า Modal เพื่อให้ผู้ใช้งานตรวจสอบผู้อนุมัติก่อนกรอก PIN
- **Workflow Data**: ปรับ `getDocumentWorkflowStatus()` ให้ JOIN `email` ของผู้อนุมัติจาก `user_profiles`

---

## [2026-05-12 10:40] - Reporter Workflow Approver Sync Fix
- **Workflow Fix**: เพิ่ม `syncDynamicWorkflowApprovers()` เพื่อ Sync `document_approvals.approver_id` ของ Step `role_required = reporter` ให้ตรงกับ `incidents.reported_by_id`
- **Incident Edit Sync**: เมื่อแก้ไข Requester ใน Incident ที่กำลัง `workflow_status = pending` ระบบจะ Sync Reporter Step ที่ยังรออนุมัติให้เป็นผู้แจ้งคนใหม่
- **Standards Sync**: อัปเดต `WORKFLOW_ENGINE.md` ให้ระบุว่า `role_required = reporter` เป็น Dynamic Identity Mapping ไม่ใช่ Role Pool และต้องไม่ปล่อย `approver_id` เป็น `NULL`

---

## [2026-05-12 10:24] - Employee Personal Approval Access Fix
- **Access Control Fix**: ปรับ `app/dashboard/layout.js` ให้ `/dashboard/approvals` และ `/dashboard/my-pending` เป็น Personal Paths ที่ทุก Role เข้าถึงได้ตามมาตรฐาน `PERMISSIONS.md`
- **Personal Navigation**: เพิ่ม Logic ให้เมนู Personal Approval ใน Sidebar ไม่ถูกซ่อนด้วย Dynamic `permission_sets` เพื่อให้ Employee เห็นกล่อง/ลิงก์ส่วนตัวของตนเอง
- **Standards Compliance**: ยืนยันว่าเป็นการแก้ Access Control ตามมาตรฐาน Personal Pages ไม่ใช่ UI Hack

---

## [2026-05-12 09:59] - Incident Approval `verified_by_pin` Schema Fix
- **Database Migration**: เพิ่ม Migration `supabase/migrations/20260512_fix_document_approvals_verified_by_pin.sql` เพื่อเพิ่มคอลัมน์ `document_approvals.verified_by_pin` ที่ `handle_approval_step()` ต้องใช้ตอน Approver กดอนุมัติ
- **Fresh Setup Safety**: อัปเดต Migration เดิม `supabase/migrations/20260508_workflow_refinement_phase_2.sql` ให้สร้าง `verified_by_pin` ก่อน RPC เขียนค่า เพื่อป้องกันฐานข้อมูลใหม่เจอ Error เดิม
- **Standards Sync**: อัปเดต `docs/standards/WORKFLOW_ENGINE.md` ให้ระบุ `verified_by_pin` เป็นหลักฐาน Audit สำหรับ Remote Approval/PIN Verification

---

## [2026-05-12 08:13] - Remote Approval Modal UI Refinement
- **UI/UX Update**: ปรับปรุง `UnifiedApprovalModal` สำหรับ Remote Approval ให้เป็น Premium Card-based Modal พร้อม Gradient Header, Responsive Layout, Section Cards และ Footer Action Area ที่จัดวางชัดเจนขึ้น
- **PIN UX Update**: เปลี่ยนช่องกรอก PIN จากกล่องแยก 6 ช่อง/Hidden Input เป็น Textbox เดียวแบบ Numeric Password พร้อมตัวนับ `0/6` เพื่อให้ใช้งานง่ายขึ้นและยังคงบังคับ PIN 6 หลักตามมาตรฐาน Remote Approval
- **Verification**: ตรวจสอบด้วย `npm run lint -- components/workflow/UnifiedApprovalModal.js` ผ่านเรียบร้อย

---

## [2026-05-12 07:53] - Agent Start Workflow Clarification
- **Standards Update**: ปรับปรุง `AGENTS.md` ข้อ `[DAILY LOG SHRINKING]` ให้ระบุชัดเจนว่าเมื่อ USER แจ้งว่า "เริ่มงานได้" Agent ต้องตรวจสอบ `CHANGELOG.md` และทำ Daily Log Shrinking ก่อนเริ่มงานหากวันที่ไม่ตรงกับวันปัจจุบัน

---

## [2026-05-12 07:38] - Status Check & Daily Maintenance
- **Maintenance**: ดำเนินการ Daily Log Shrinking (ย้ายบันทึกของวันที่ 2026-05-11 ไปยัง Archive)
- **Status Check**: ตรวจสอบสถานะงานปัจจุบันใน `USER_TASKS.md` และเตรียมการแก้ไข `Global Dashboard Header`

---

## 📦 บันทึกย้อนหลัง (Archives)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_11.md)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 12-May-2026 (Daily Maintenance Completed)*
