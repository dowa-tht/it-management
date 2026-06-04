# 📦 CHANGELOG Archive — 25 พฤษภาคม 2569 (25-May-2026)

## 25 พฤษภาคม 2569 (25-May-2026)
- **15:10 +07:00 | MODULE: IT Checklist - Detail UI Redesign & Time Tracking:**
  - สร้าง Database Migration `20260525_checklist_time_tracking.sql` เพิ่ม columns สำหรับ time tracking และ evaluation
  - เพิ่มส่วน "ข้อมูลเวลาการดำเนินการ" ใน Checklist Detail: เวลาเริ่มต้น (input), เวลาสิ้นสุด (คำนวณอัตโนมัติ), ระยะเวลารวม
  - ออกแบบ UI ใหม่สำหรับแต่ละรายการตรวจสอบ: ขั้นตอนการดำเนินการ, ผู้รับผิดชอบ, เกณฑ์วัดผลการซ้อม, เวลาดำเนินการ (HH:mm), ผลการประเมิน (OK/NG)
  - พัฒนา functions สำหรับคำนวณเวลาสิ้นสุดอัตโนมัติจากเวลาเริ่ม + ผลรวมเวลาแต่ละรายการ
  - รองรับรูปแบบเวลา DD/MMM/YYYY HH:mm (24H) สำหรับเวลาเริ่มต้น
  - รันการทดสอบระบบ (`npm test`) ผ่าน 100% (12/12 tests passed)
- **15:05 +07:00 | MODULE: Workflow Engine - Cancel Document Feature:**
  - เพิ่ม Server Action `cancelDocument()` ใน `app/actions/workflow.js` สำหรับยกเลิกเอกสาร Checklist และ Incident
  - เพิ่ม Server Action `requestIncidentCancelOTP()` สำหรับขอ OTP ยืนยันการยกเลิก Incident
  - อัปเดต `WorkflowActionBar` component รองรับปุ่มยกเลิก (`canCancel`, `onCancel`) และแสดงสถานะ Cancelled เป็นสีแดง
  - พัฒนา Cancel Dialog สำหรับ Checklist: ระบุเหตุผล → ยืนยัน (Creator/Admin)
  - พัฒนา Cancel Dialog สำหรับ Incident: ระบุเหตุผล → ยืนยันด้วย PIN หรือ OTP จากผู้แจ้ง (Reporter) เท่านั้น
  - สร้าง Database Migration `20260525_cancel_document_support.sql` เพิ่ม columns `cancelled_at`, `cancelled_by`, `cancel_reason` ให้ `checklist_docs` และ `incidents`
  - อัปเดต Checklist Detail Page และ Incident Detail Page ให้ซ่อนการกระทำต่างๆ เมื่อสถานะเป็น Cancelled
  - รันการทดสอบระบบ (`npm test`) ผ่าน 100% (12/12 tests passed)
- **10:30 +07:00 | MODULE: Workflow Settings - Filter Users by Role:**
  - แก้ไข `dashboard/settings/workflow/page.js` ให้กรองรายชื่อผู้ใช้ในช่อง "ระบุผู้อนุมัติเฉพาะเจาะจง" ตาม Role ที่เลือก
  - Dynamic Roles (reporter, creator) แสดงทุก user, System Roles กรองเฉพาะ user ที่มี role ตรงกัน
- **09:15 +07:00 | MODULE: Procedure Plan Editor - Label Update:**
  - เปลี่ยน label "Instruction" เป็น "ขั้นตอนการดำเนินการ" ใน `ProcedurePlanEditorClient.js`
