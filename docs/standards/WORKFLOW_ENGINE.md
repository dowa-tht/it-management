# ⚙️ Unified Workflow Engine Standard

มาตรฐานการจัดการกระบวนการอนุมัติ (Approval Workflow) แบบรวมศูนย์ เพื่อรองรับความยืดหยุ่น การตั้งค่าได้เอง และการตรวจสอบ (Audit Trail) ในรูปแบบเดียวทั้งระบบ

---

## 1. Database Schema (โครงสร้างฐานข้อมูล)

เราจะใช้ 2 ตารางหลักในการควบคุมกระบวนการนี้:

### 1.1 `workflow_configs` (ตารางตั้งค่า Flow)
ใช้สำหรับให้ Admin ตั้งค่าว่าเอกสารแต่ละประเภทต้องผ่านใครบ้าง
- `id`: UUID (PK)
- `target_type`: ประเภทเอกสาร (`checklist`, `incident`)
- `condition_key`: กุญแจเงื่อนไข (เช่น `freq_type` สำหรับ Checklist, `severity` สำหรับ Incident)
- `condition_value`: ค่าของเงื่อนไข (เช่น `Daily`, `High`)
- `step_order`: ลำดับที่ (1, 2, 3, ...)
- `role_required`: บทบาทที่ต้องอนุมัติ (`it_officer`, `manager`, `director`)
- `is_active`: สถานะการใช้งาน

### 1.2 `document_approvals` (ตารางบันทึกการอนุมัติจริง)
ใช้สำหรับเก็บประวัติการเซ็นชื่อและสถานะปัจจุบันของแต่ละใบงาน
- `id`: UUID (PK)
- `doc_id`: ID ของเอกสาร (เชื่อมกับ `checklist_docs` หรือ `incidents`)
- `doc_type`: ประเภทเอกสาร
- `step_order`: ลำดับที่ของขั้นตอนนี้
- `approver_id`: UUID ของผู้ที่มีสิทธิ์อนุมัติ (มาจาก Config หรือเลือกเจาะจง)
- `status`: สถานะปัจจุบัน (`waiting`, `pending`, `approved`, `rejected`)
- `signature_data`: ลายเซ็นดิจิทัล (Base64)
- `comment`: ความคิดเห็นเพิ่มเติม
- `action_at`: วันที่และเวลาที่ดำเนินการ

---

## 2. Dynamic Logic (กระบวนการทำงาน)

### 🔄 การสร้าง Workflow (Submission)
เมื่อ User กดส่งเอกสารเพื่อขออนุมัติ:
1. ระบบจะไป Query ตาราง `workflow_configs` ตามเงื่อนไขของเอกสารนั้นๆ
2. ระบบจะ Insert ข้อมูลลงตาราง `document_approvals` ตามจำนวน Step ที่ตั้งไว้
3. Step ที่ 1 จะถูกตั้งสถานะเป็น `pending` (พร้อมอนุมัติ) ส่วน Step อื่นๆ เป็น `waiting`

### ✅ การอนุมัติ (Processing)
1. เมื่อผู้อนุมัติลำดับที่ 1 เซ็นชื่อ -> สถานะของ Step 1 จะเปลี่ยนเป็น `approved`
2. ระบบจะทำการ **"ปลดล็อค"** Step ถัดไป (เปลี่ยน Step 2 จาก `waiting` เป็น `pending`) อัตโนมัติ
3. เมื่อทุกลำดับเซ็นครบ -> สถานะหลักของเอกสารในตารางหลักจะเปลี่ยนเป็น `Closed`

---

## 3. Migration Plan (แผนการย้ายข้อมูลเก่า)

เราจะทำการรัน Script เพื่อย้ายข้อมูลจากคอลัมน์เดิมเข้าสู่ระบบใหม่ดังนี้:

### สำหรับ Checklist Docs (เดิมมี 1 ขั้นตอน)
- ดึงข้อมูลจาก `approved_by` และ `approved_at`
- สร้าง 1 Record ใน `document_approvals` โดยตั้งเป็น Step 1 (Status: `approved`)

### สำหรับ Incidents (เดิมมี 3 ขั้นตอน: IT, Reporter, Manager)
- **Step 1 (IT)**: ดึงจาก `signature_it` และ `resolved_by`
- **Step 2 (Reporter)**: ดึงจาก `signature_reporter` และ `reported_by`
- **Step 3 (Manager)**: ดึงจาก `signature_manager` และ `approved_by`
- สร้าง 3 Records เรียงตามลำดับ เพื่อให้ Audit Trail ในอดีตยังคงสมบูรณ์

---

## 4. Admin Management (หน้าจอตั้งค่า)
Admin สามารถจัดการ Flow ได้ผ่านเมนู **Master Data > Workflow Settings**
- สามารถแก้ไขผู้อนุมัติได้โดยไม่ต้องแก้โค้ด
- สามารถเพิ่ม Step พิเศษสำหรับกรณีเฉพาะได้เอง

---
> [!NOTE]
> **มาตรฐานนี้จะมีผลบังคับใช้กับทุกโมดูลที่จะเกิดขึ้นในอนาคต** เพื่อความง่ายในการดึงรายงานภาพรวม (Centralized Logging)
