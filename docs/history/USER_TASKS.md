# 📝 รายการงานที่ต้องดำเนินการ (USER_TASKS)

ไฟล์นี้ใช้สำหรับบันทึกสิ่งที่ USER ต้องการให้ Agent แก้ไข หรือโน้ตส่วนตัวเพื่อติดตามความคืบหน้าของงานที่ Agent กำลังทำอยู่

> [!IMPORTANT]
> **สำหรับ AI Agent**: คุณต้องอ่านไฟล์นี้ทุกครั้งที่เริ่มงานใหม่ เพื่อเตือนความจำ USER ถึงงานที่ยังค้างอยู่ หรือตรวจสอบว่ามีงานไหนที่ทำเสร็จแล้วแต่ยังไม่ได้อัปเดตสถานะ

---

## 🛠️ รายการงานที่รอดำเนินการ (Pending Tasks)

- `[x]` **Full Role & Permission Migration**: ล้างระบบ Role เดิม และเปลี่ยนมาใช้มาตรฐานใหม่ (Admin, IT Staff, Employee, Auditor, Approver) ทั้งใน DB และ Code (อ้างอิง [REF_ROLE_AUDITOR_REFACTOR.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_ROLE_AUDITOR_REFACTOR.md)) -- **DONE**
- `[x]` **Standardize Administrative Workflow Actions**: (e.g., `adminResetWorkflow`) -- **DONE**
- `[x]` **Update Incident Management UI Access Control**: (replace `visitor`/`superuser` checks) -- **DONE**
- `[x]` **Verify Audit Trail Integrity**: สำหรับโครงสร้าง RBAC ใหม่ -- **DONE**
- `[x]` **SLA Calculation Fix**: แก้ไขสูตรคำนวณ "3 วันทำการ" ให้เป็น 1,620 นาที (9 ชม./วัน) แทนการนับ 24 ชม. (รายละเอียดใน [REF_SLA_CALCULATION_FIX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_SLA_CALCULATION_FIX.md)) -- **DONE**
- `[x]` **User Management Hardening**: เพิ่มระบบ Admin Audit Logs, Auto-Deactivate สำหรับ Guest และย้าย PIN Lockout ไปที่ Server-side (รายละเอียดใน [REF_USER_MANAGEMENT_HARDENING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_USER_MANAGEMENT_HARDENING.md)) -- **DONE**
- `[x]` **PIN Lockout Server-side Migration**: (รวมอยู่ในแผนด้านบนแล้ว) -- **DONE**
- `[x]` **Quick Add Email Refactor**: ปรับปรุงการส่งเมลในหน้า Incidents > New (ลำดับที่ 2 ใน Email Trigger) ให้ส่งเป็นลิงก์ตั้งค่าบัญชี Onboarding (Self-Registration) แทนการส่งรหัสชั่วคราว (Done: ย้ายไปใช้ Onboarding Link แทน OTP แล้ว)
- `[ ]` **Email Notification for Approvers**: พิจารณาเพิ่มการส่งเมลแจ้งเตือนผู้อนุมัติ (หาก USER ต้องการเปลี่ยนจากระบบ Manual Check เป็น Auto Notification)
- `[x]` **Unified Workflow Standardization**: ปรับปรุงระบบ Approval และ Workflow ทั้งระบบให้เป็นมาตรฐานเดียวกัน (Done: รวมศูนย์ Engine, ปิดช่องโหว่ PIN, และวางรากฐาน Log กลางเรียบร้อย) -- **DONE**
- `[x]` **Audit trail for Email Logs**: เพิ่มตารางเก็บ Log การส่งอีเมลที่ออกจากระบบ Resend เพื่อความโปร่งใสในการตรวจสอบ (Audit) (Done: สร้างตาราง email_logs และเชื่อมต่อ lib/resend เรียบร้อย)
- `[x]` **Logs Dashboard Debugging**: แก้ไข Runtime Error ในหน้าจอ Logs และปรับปรุง UI ร่วมกับ USER (Done: Fixed ReferenceError & Hooks ordering)
- `[x]` **Daily Log Shrinking Implementation**: พัฒนาระบบจัดการ Changelog แบบรายวัน (Daily Logs) และการทำ Archive อัตโนมัติเพื่อลดขนาด Context (Done: แยกไฟล์รายวันย้อนหลังถึงเดือนเมษายนและกำหนดกฎใน AGENTS.md เรียบร้อย)
- `[x]` **Workflow Refinement Phase 2**: ปรับปรุงความเสถียรของระบบ Workflow (Transaction & Centralized Logs) ตามแผนใน [WORKFLOW_REFINEMENT_PHASE_2.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/WORKFLOW_REFINEMENT_PHASE_2.md) (Done: ใช้ RPC `handle_approval_step` และรวมศูนย์ Log สำเร็จ 100%)
- `[x]` **UI/UX Modernization & Overhaul (Premium Enterprise Standard)**: 
  - **Dashboard Modernization**: ปรับปรุง SLA Card (Dynamic Color/Gradient), เพิ่มขนาดจุดสถานะ Checklist (Legend & Interactive), และปรับปรุงหน้าจอ Member Dashboard ให้พรีเมียมขึ้น
  - **Document Detail Pages**: โอเวอร์ฮอลหน้า Incident และ Checklist Detail เป็นระบบ Card-based + Responsive Grid พร้อมปุ่มย้อนกลับมาตรฐาน
  - **SLA Report Dashboard**: ปรับปรุงหน้าจอรายงาน SLA ให้รองรับ Visual Tracking (Status-based Colors) และแก้ไข Layout ตาราง -- **DONE**
- `[x]` **Incident Management Stability Fix**: แก้ไขข้อผิดพลาดในการบันทึกข้อมูล (400 Bad Request) ที่เกิดจาก Data Join ในหน้าจอ Detail และเพิ่มระบบ Auto-Logging สำหรับการเปลี่ยน Severity -- **DONE**


---

## 📌 โน้ตเพิ่มเติม (User Notes)
*(USER สามารถเขียนสิ่งที่ต้องการแก้ไขหรือฝากงานไว้ตรงนี้ได้เลย)*

---
*อัปเดตล่าสุด: 08-May-2026 (Incident Stability Fix & UI Modernization Completed)*
