# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs) - 11 May 2026

## [2026-05-11 22:47] - Incident List: แสดงชื่อผู้สร้างในคอลัมน์ Workflow Process
- **Card View**: เพิ่มบรรทัด "ผู้สร้าง: {ชื่อ}" ขนาดเล็ก (10px) ใต้ Workflow Progress bar ในการ์ด Incident
- **Table View**: เพิ่มบรรทัด "ผู้สร้าง: {ชื่อ}" ขนาดเล็ก (10px) ใต้ Workflow Progress column ในตารางรายการ Incident
- ใช้ข้อมูล `inc.reported_by` ที่มีอยู่แล้วจากฐานข้อมูล (ไม่ต้อง query เพิ่ม)

## [2026-05-11 22:23] - Approval Modal Conditional Rendering & UI Polish
- **Creator Self-Approval**: เพิ่มเงื่อนไขใน `UnifiedApprovalModal` โดยรับ prop `isCreator` — หากผู้ใช้ที่ login เป็นผู้สร้างเอกสารเอง จะแสดงเฉพาะช่อง "ความเห็นเพิ่มเติม (ถ้ามี)" เท่านั้น (ไม่มี Signature Pad, ไม่มี PIN)
- **Non-Creator Full Modal**: หากผู้ใช้ไม่ใช่ผู้สร้าง จะแสดง Modal แบบเต็ม (Signature + PIN + Comment) ตามเดิม
- **Textarea Padding Improvement**: ปรับปรุงระยะห่างภายในช่อง textarea (`padding: 16px 20px`, `line-height: 1.6`) ให้ตัวอักษรไม่ชิดกล่องข้อความ
- **Incident Page**: ส่ง `isCreator={currentUser?.id === incident?.reported_by_id}` ไปยัง `UnifiedApprovalModal`
- **Checklist Page**: ส่ง `isCreator={currentUser?.id === doc?.created_by_id}` ไปยัง `UnifiedApprovalModal`

## [2026-05-11 14:38] - Dashboard & Workflow Refinement Phase 3
- **Dashboard Reordering**: ปรับลำดับกล่องสถิติในหน้า Dashboard ตามแผนการทำงาน (Checklist NG ขึ้นมาเป็นลำดับแรก)
- **Access Control Enforcement**: ล็อคสิทธิ์แก้ไขรายละเอียด Incident สำหรับผู้แจ้ง (Employee) เมื่อสถานะเปลี่ยนจาก Open เป็น In Progress
- **Remote Approval Feature**: เพิ่มฟังก์ชัน "อนุมัติแทน (Remote)" ให้ Admin/IT สามารถนำอุปกรณ์ไปให้ Requester หรือ Manager ลงนามด้วย PIN ได้ทันทีจากหน้าจอ Detail
- **Workflow Approver Bug Fix**: แก้ไขปัญหาที่ `approver_id` เป็น null สำหรับ role `reporter` ทำให้เอกสารที่รออนุมัติไม่แสดงในหน้าของผู้อนุมัติ โดยเพิ่ม Logic การ Inject `reported_by_id` อัตโนมัติและจัดการอัปเดตข้อมูลเก่าให้ถูกต้อง

## [2026-05-11 10:55] - Approval Modal Layout & Fix
- **UI/UX Fix**: แก้ไขปัญหาการแสดงผลของ Approval Modal ที่เนื้อหาชิดขอบและหลุดเฟรม
- **Layout Refactoring**: เพิ่มระยะห่าง (Padding) รอบตัว Modal และขยายความกว้างสูงสุดเป็น `max-w-xl` เพื่อเพิ่มพื้นที่หายใจ (Breathing Room)
- **Component Alignment**: จัดวาง Signature Pad และขั้นตอนการทำงานให้กึ่งกลางและเว้นระยะจากขอบอย่างเหมาะสม เพื่อให้อ่านง่ายและใช้งานสะดวกบนทุกหน้าจอ

### 🚀 11-May-2026 (Morning Session)
- **Incident Workflow Standardization**: กำหนดมาตรฐานขั้นตอนการอนุมัติสำหรับทุกลำดับความรุนแรง (Low/Medium: IT -> Requester, High: IT -> Auditor -> Manager)
- **Dynamic Role Engine**: พัฒนาระบบ `reporter` role injection ใน Workflow Engine ให้สามารถดึงข้อมูลผู้แจ้งมาเป็นผู้อนุมัติได้อัตโนมัติ
- **UI Consistency Fix**: แก้ไขปัญหา Progress Bar หายในเคส Low/Medium โดยการบังคับให้ทุก Severity ต้องมีขั้นตอนการทำงาน (Step)
- **Agent Governance**: บันทึกกฎการทำงานใหม่ลงใน `AGENTS.md` (Double-verification & Detailed Planning) เพื่อยกระดับคุณภาพงาน
