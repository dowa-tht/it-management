# 📘 DOWA IT System - Documentation Index

**[ATTENTION AI AGENTS]**  
This is the central documentation hub. You MUST read this file first before starting any task to understand the system's architecture and find the relevant documentation for your specific task. **DO NOT read all files unless necessary to avoid context overflow.**

---

## 🏛️ 1. Architecture & Core Systems (`docs/architecture/`)
เอกสารหมวดนี้เกี่ยวกับโครงสร้างพื้นฐาน การออกแบบฐานข้อมูล และระบบความปลอดภัย
- [DATABASE_AND_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/DATABASE_AND_FLOW.md) : โครงสร้าง Database หลัก, ความสัมพันธ์ของตาราง, และ Workflow การทำงาน (Authentication, Checklist Engine)
- [RBAC.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC.md) : แผนงานและโครงสร้างของระบบสิทธิ์การใช้งาน (Role-Based Access Control) แบบ 4 ระดับ (Admin, Supervisor, Approval, Guest)
- [RBAC_PLAN_THAI.txt](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC_PLAN_THAI.txt) : บันทึกการวางแผนระบบ RBAC เริ่มต้น (Archive)

---

## 📜 2. Standards & Policies (`docs/standards/`)
เอกสารหมวดนี้คือกฎเหล็กและมาตรฐานที่ต้องปฏิบัติตามอย่างเคร่งครัด
- [ZERO_HACK_POLICY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/ZERO_HACK_POLICY.md) : นโยบายห้ามใช้ UI Hacks, ต้องยึดมาตรฐานสถานะใน Database อย่างเคร่งครัด
- [DEVELOPMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DEVELOPMENT.md) : มาตรฐานการเขียนโค้ด, การทำ Logging, และ Security
- [WORKFLOW_ENGINE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/WORKFLOW_ENGINE.md) : มาตรฐานระบบการอนุมัติเอกสารและ Document Status (เช่น Open, In Progress, Pending Approval, Closed)
- [UI_UX_SETTING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_SETTING.md) : มาตรฐานการออกแบบหน้าจอ Setting/Master Data
- [UI_UX_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_GUIDE.md) : มาตรฐานการทำระบบช่วยเหลือ (Help/Guides) ภายในระบบ
- [USER_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/USER_MANAGEMENT.md) : มาตรฐานการจัดการผู้ใช้, ความปลอดภัย, Onboarding Flow และ Guest Expiry
- [PERMISSIONS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/PERMISSIONS.md) : มาตรฐานระบบสิทธิ์การใช้งานแบบ Dynamic (RW, RO, NONE)
- [UI_UX_RESPONSIVE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_RESPONSIVE.md) : มาตรฐานการออกแบบหน้าจอให้รองรับทุกอุปกรณ์ (Multi-Device Support)

---

## 📅 3. History & Reports (`docs/history/`)
เอกสารหมวดนี้ใช้สำหรับดูประวัติการพัฒนาและสถานะของระบบ
- [CHANGELOG.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/CHANGELOG.md) : บันทึกการเปลี่ยนแปลงและอัปเดตระบบในแต่ละวัน
- [STATUS_REPORT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/STATUS_REPORT.md) : รายงานสถานะปัจจุบันของฟีเจอร์ต่างๆ ว่าทำงานปกติหรือไม่
- [INCIDENT_APPROVAL_MIGRATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/INCIDENT_APPROVAL_MIGRATION.md) : บันทึกประวัติการย้ายข้อมูลประวัติการอนุมัติ Incident เข้าสู่ระบบ Unified Workflow

---

## 📖 4. Manuals & Guides (`docs/manuals/`)
เอกสารคู่มือการใช้งานระบบสำหรับผู้ใช้และผู้พัฒนา
- [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) : คู่มือการทำงานของระบบ Workflow (Incident & Checklist)

---

### 🤖 AI Agent Workflow Instructions:
1. **Identify the Task:** วิเคราะห์คำสั่งจาก USER ว่าเกี่ยวกับส่วนใดของระบบ
2. **Find the Standard:** เลือกอ่านไฟล์ `.md` ด้านบนที่เกี่ยวข้องกับงานนั้นๆ (เช่น หากงานแก้ UI ให้ดู `UI_UX_SETTING.md`, งานแก้ไขสถานะงานให้ดู `WORKFLOW_ENGINE.md`)
3. **Follow the Rules:** ปฏิบัติตาม `ZERO_HACK_POLICY.md` เสมอ
4. **Update Logs:** เมื่อทำงานเสร็จสิ้น ให้บันทึกผลลงใน `CHANGELOG.md` เสมอ
