# 🗺️ Document Mapping Standard (Unified Workflow)

**Version:** 1.0  
**Last Updated:** 10-May-2026  
**Purpose:** มาตรฐานการจับคู่ข้อมูล (Mapping) ระหว่างสถานะทางธุรกิจ (Business Status) และสถานะของระบบ (System Workflow) เพื่อให้ Agent ทุกตัวทำงานบนตรรกะเดียวกัน

---

## 1. Status Mapping Matrix (ตารางเปรียบเทียบสถานะ)

ระบบแยกสถานะออกเป็น 2 ประเภทเพื่อความยืดหยุ่นในการจัดการ และต้องมีการอัปเดตควบคู่กันเสมอ

| Business Status (`status`) | Workflow Status (`workflow_status`) | คำอธิบาย (Context) |
| :--- | :--- | :--- |
| **Open** | `draft` | เอกสารเพิ่งถูกสร้าง ยังไม่มีการรับเรื่องหรือส่งอนุมัติ |
| **In Progress** | `draft` | เจ้าหน้าที่รับเรื่องแล้ว (Acknowledge) และกำลังแก้ไขปัญหา |
| **Pending Approval** | `pending` | แก้ไขเสร็จสิ้นและส่งเข้าสู่กระบวนการอนุมัติตามลำดับ |
| **Closed** | `approved` | **(Final State)** ผู้อนุมัติคนสุดท้ายกด Approve เรียบร้อย |
| **Open** (Reopened) | `rejected` | ถูกตีกลับโดยผู้อนุมัติ หรือ Admin สั่ง Reopen ใหม่ |

---

## 2. Entity Relationship Mapping (ความสัมพันธ์ของข้อมูล)

ทุกโมดูลเอกสาร (Documents) จะใช้ตารางส่วนกลางในการจัดการ Workflow และ Audit Trail

| ตารางหลัก (Core Tables) | เชื่อมต่อกับ (Link To) | ความสัมพันธ์ | Foreign Key |
| :--- | :--- | :--- | :--- |
| `incidents` / `checklist_docs` | `document_approvals` | 1 : N | `doc_id` |
| `incidents` / `checklist_docs` | `system_audit_logs` | 1 : N | `doc_id` |
| `document_approvals` | `user_profiles` | N : 1 | `approver_id` |
| `incidents` | `user_profiles` | N : 1 | `reported_by_id` |
| `incidents` | `user_profiles` | N : 1 | `assigned_to_id` |

---

## 3. Data Integrity Standards (มาตรฐานความถูกต้องของข้อมูล)

### 3.1 Reporter Identification
- **`reported_by` (Text)**: เก็บชื่อเต็ม ณ วันที่สร้างเอกสาร (Snapshot) เพื่อใช้เป็นหลักฐานทางประวัติศาสตร์
- **`reported_by_id` (UUID)**: เชื่อมโยงกับโปรไฟล์ผู้ใช้ปัจจุบัน เพื่อใช้ตรวจสอบสิทธิ์ (Ownership)

### 3.2 Signature Management
- **Initial Submission**: ไม่บันทึกรูปภาพ (Image) แต่บันทึก Full Name + Timestamp ลงใน `metadata` ของ `system_audit_logs`
- **Approval Signatures**: บันทึกลงใน `document_approvals.signature_data` (Data URL)

### 3.3 Checklist Photo Evidence Mapping
- หลักฐานภาพของ Checklist ถูกบันทึกใน `checklist_items.template_data`
- `template_data.photos` ใช้เก็บ OneDrive file id แยกตาม `point index`
- `template_data.photo_meta` ใช้เก็บ metadata ของภาพ เช่น:
  - `file_id`
  - `point_label`
  - `captured_at`
  - `status` ของ geolocation (`captured`, `skipped`, `denied`, `unsupported`, `timeout`, `error`)
  - `lat`
  - `lng`
  - `accuracy`
  - `message`
- หาก geolocation เป็น optional และผู้ใช้ไม่อนุญาต ระบบยังต้องบันทึกรูปภาพได้ตามปกติ โดยเก็บ `lat` และ `lng` เป็น `null`

### 3.4 Checklist Template Config Mapping
- `checklist_templates.template_config` เป็น source of truth สำหรับการตั้งค่าเชิงลึกของ Template Builder
- การบันทึก `template_config` ต้อง validate ที่ server ทุกครั้งก่อน `insert` หรือ `update`
- โครงสร้างขั้นต่ำของแต่ละ `ui_template_type`:
  - `T0 Standard`: `allow_na`, `note_required_on_ng`, `auto_open_incident`, `severity`
  - `T1 Photo Evidence`: `photo_points`, `min_photos`, `allow_retake`, `enable_location_toggle`, `watermark`
  - `T2 Procedure Table`: `plan_id`, `enforce_sequence`, `require_all_steps`
  - `T3 Measurement`: `unit`, `min`, `max`, `decimal_places`, `fail_mode`
  - `T4 Link Verification`: `url`, `note_required`, `screenshot_required`
- `T5 Sign-off`: `signers`, `require_order`, `pin_required`
- เอกสาร Checklist ที่ถูกสร้างแล้วต้องอ้างอิง snapshot เดิมใน `checklist_items.template_data._snapshot.config` ต่อไป ห้าม render ย้อนหลังจาก master config ล่าสุดอย่างเดียว

### 3.5 Procedure Plan Step Mapping
- `checklist_procedure_plans.steps` ใช้เก็บ metadata ของ SOP ในรูปแบบ object ที่มี key `rows`
- `steps.rows[]` แต่ละรายการต้องมี field ขั้นต่ำ:
  - `step_no`
  - `title`
  - `instruction`
  - `step_type`
  - `required`
  - `evidence_rule.photo_required`
  - `evidence_rule.note_required`
- `T2 Procedure Table` ต้องอ้างอิง `template_config.plan_id` ไปยัง `checklist_procedure_plans.id`
- หน้า checklist detail ต้อง render ชื่อขั้นตอนจาก `title` เป็นหลัก และ fallback ไป `instruction` เฉพาะเมื่อไม่มี `title`

---

## 4. Workflow Engine Logic (RPC Mapping)

ฟังก์ชัน `handle_approval_step` จะจัดการการเปลี่ยนสถานะตามประเภทเอกสารที่ระบุใน `p_doc_type`:

1.  **Lookup**: ค้นหา Step ลำดับถัดไปใน `document_approvals`
2.  **Logic If Next Step Found**:
    - ปรับ Step ปัจจุบันเป็น `approved`
    - ปรับ Step ถัดไปเป็น `pending`
    - **Status**: ไม่มีการเปลี่ยน `status` ของเอกสารหลัก (ยังคงเป็น `Pending Approval`)
3.  **Logic If Final Step**:
    - ปรับ `workflow_status` เป็น `approved`
    - ปรับ `status` ของเอกสารหลักเป็น `Closed` (Auto-Mapping)

---

## 5. Module Specific Paths

| Document Type | Root Table | Workflow Registry Key |
| :--- | :--- | :--- |
| **Incident** | `public.incidents` | `incident` |
| **Checklist** | `public.checklist_docs` | `checklist` |

---

> [!IMPORTANT]
> **Agent Implementation Rule:** ห้ามมีการ Hardcode ชื่อตารางหรือสถานะใน UI คอมโพเนนต์ ให้เรียกใช้ผ่าน `WORKFLOW_DOC_REGISTRY` ใน `lib/workflowRegistry.js` เสมอ เพื่อให้การ Mapping เป็นไปตามมาตรฐานฉบับนี้
