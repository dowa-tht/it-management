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

### 1.3 `approval_configs` (ตารางกำหนดผู้อนุมัติหลัก)
ใช้สำหรับกำหนดว่าใครเป็นผู้รับผิดชอบหลักในแต่ละความถี่หรืองาน
- `id`: UUID (PK)
- `target_type`: ประเภทเอกสาร (`checklist`, `incident`)
- `freq_type`: ความถี่หรือเงื่อนไข (`Daily`, `High`, etc.)
- `primary_approver_id`: UUID ของผู้อนุมัติหลัก (เชื่อมกับ `user_profiles.id`)

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
- `verified_by_pin`: Boolean สำหรับบันทึกหลักฐานว่า Step นี้ผ่านการยืนยัน PIN ของผู้อนุมัติ โดยเฉพาะ Remote Approval

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

## 4. Approval Modes & Identity Verification (โหมดการอนุมัติและการยืนยันตัวตน)

เพื่อให้เป็นไปตามนโยบายความปลอดภัยสูงสุด ระบบรองรับการอนุมัติ 2 รูปแบบหลัก:

### 4.1 Direct Approval (อนุมัติด้วยบัญชีตนเอง)
*   **เงื่อนไข**: ผู้ที่ Login อยู่ในระบบคือผู้ที่มีสิทธิ์อนุมัติตามขั้นตอนนั้นๆ โดยตรง
*   **กระบวนการ**: สามารถกดปุ่มอนุมัติและเซ็นชื่อได้ทันที (อาจไม่ต้องใช้ PIN หากระบบกำหนดว่าการ Login คือการยืนยันตัวตนแล้ว)
*   **การบันทึก**: ระบบจะแสตมป์ชื่อและอีเมลของผู้ที่ Login อยู่ลงในเอกสาร

### 4.2 Remote Approval (ผู้อนุมัติเซ็นผ่านเครื่องของผู้อื่น)
*   **เงื่อนไข**: ผู้ที่ Login อยู่คือผู้ส่งเอกสาร (Sender) แต่นำอุปกรณ์ไปให้ผู้อนุมัติ (Boss) เซ็นที่โต๊ะหรือหน้างาน
*   **กฎเหล็ก**: 
    1.  **ต้องใช้ PIN**: ผู้อนุมัติจะต้องกรอกรหัส PIN 6 หลักของตนเองเพื่อยืนยันตัวตนเสมอ
    2.  **ตรวจสอบสิทธิ์**: ระบบจะตรวจสอบว่า PIN ที่กรอกนั้นตรงกับผู้อนุมัติที่มีสิทธิ์ในขั้นตอนนั้นจริงๆ (ไม่ใช่ใครก็ได้)
    3.  **การแสตมป์ตัวตน**: แม้จะใช้บัญชีของ Sender ในการส่งข้อมูล แต่ระบบจะแสตมป์ชื่อและอีเมลของ **เจ้าของ PIN** ลงในเอกสารและ Log เพื่อความถูกต้องทางกฎหมาย (Non-repudiation)

---

## 5. Logging Standard (มาตรฐานการบันทึกประวัติ)

> [!IMPORTANT]
> ตั้งแต่ **08-May-2026** เป็นต้นไป ระบบใช้ **Centralized Logging** ผ่านตารางเดียว

- **Centralized Table**: `system_audit_logs`
- **Format**: บันทึกแยกคอลัมน์ `action` และ `details` เพื่อความยืดหยุ่นในการ Filter
- **Legacy Support**: ตาราง `incident_logs` และ `checklist_logs` จะถูกเก็บไว้เพื่อ Backward Compatibility แต่ระบบใหม่จะบันทึกลงตารางกลางเพียงที่เดียว
- **Metadata**: ใช้คอลัมน์ `metadata` (JSONB) เพื่อเก็บข้อมูลเสริม เช่น `step_order`, `is_remote`, `doc_no`

---

## 6. Post-Approval Sync (การซิงค์ข้อมูลหลังอนุมัติ)

ระบบต้องรองรับการทำงานข้าม Module (Cross-Module Sync) เมื่อเอกสารได้รับการอนุมัติขั้นสุดท้าย (Final Approval):
*   **Incident -> Checklist**: หาก Incident ถูกสร้างมาจาก Checklist (มี `ref_id`), เมื่อ Incident เปลี่ยนสถานะเป็น `Closed`, ระบบจะต้อง Update รายการใน Checklist เป็น `OK` และใส่หมายเหตุการแก้ไขให้โดยอัตโนมัติผ่านฟังก์ชัน `onDocumentFinalApproval`
*   **Auto-Approve Support**: กฎการซิงค์ข้อมูลนี้ต้องทำงานครอบคลุมทั้งกรณีอนุมัติด้วยมือ และระบบอนุมัติให้อัตโนมัติตาม Config

---

## 7. Error Handling & Safety (การจัดการข้อผิดพลาด)

*   **Missing PIN**: หากผู้อนุมัติที่ระบุในขั้นตอนยังไม่ได้ตั้งรหัส PIN ระบบจะต้องแจ้งเตือน "Approver has not set a PIN" และไม่อนุญาตให้ดำเนินการต่อจนกว่าจะมีการตั้งรหัสที่หน้า Profile
*   **PIN Locking**: หากกรอก PIN ผิดเกิน 5 ครั้ง ระบบจะระงับการเข้าถึงชั่วคราว (15 นาที) ตามมาตรฐานความปลอดภัย

---

## 8. Admin Management (หน้าจอตั้งค่า)
Admin สามารถจัดการ Flow ได้ผ่านเมนู **Master Data > Workflow Settings**
- สามารถแก้ไขผู้อนุมัติได้โดยไม่ต้องแก้โค้ด
- สามารถเพิ่ม Step พิเศษสำหรับกรณีเฉพาะได้เอง

---

## 9. Incident Lifecycle & Automatic Status Management

เพื่อให้กระบวนการแจ้งซ่อม (Incident Management) มีความเสถียรและลด Human Error ระบบจะใช้การควบคุมสถานะแบบอัตโนมัติ (Automated State Transitions):

### 9.1 Status Hierarchy (ลำดับชั้นของสถานะ)
*   **Open**: สถานะเริ่มต้นเมื่อมีการสร้าง Incident ใหม่และยังไม่ได้ระบุผู้รับผิดชอบ (Assigned To)
*   **In Progress**: ระบบจะเปลี่ยนสถานะเป็น In Progress ทันทีโดยอัตโนมัติเมื่อมีการมอบหมายงาน (Assign) หรือระบุผู้รับผิดชอบในเอกสาร
*   **Pending Approval**: สถานะเมื่อการแก้ไขเสร็จสิ้นและอยู่ระหว่างการรอลายเซ็นจากผู้ที่เกี่ยวข้องตาม Workflow Config
*   **Closed**: สถานะสุดท้ายเมื่อทุกลำดับอนุมัติเซ็นชื่อครบถ้วน

### 9.2 Data Locking & Integrity
*   **Input Protection**: ห้ามให้ผู้ใช้เลือกสถานะ (Status) เองผ่าน Dropdown ในขั้นตอนการสร้างเอกสารใหม่ เพื่อป้องกันการข้ามขั้นตอน Workflow
*   **Auto-Priority**: เมื่อมีการระบุ "ผู้รับผิดชอบ" ระบบต้องแสตมป์ Timestamp `assigned_at` และเปลี่ยน `status` ทันทีเพื่อความแม่นยำในการวัด SLA

---

## 10. Incident Resolve & Auto-Approve Standard (มาตรฐานการ Resolve และ Auto-Approve)

> **บังคับใช้ตั้งแต่ 07-May-2026** — อ้างอิงจากการแก้ไข Unified Workflow Integration

เมื่อ IT Officer กด **"Resolve"** บน Incident ระบบต้องดำเนินการตามลำดับต่อไปนี้ **ทันทีในคำสั่งเดียว**:

### 10.1 ลำดับการทำงาน (Required Sequence)
1. IT เซ็นชื่อในหน้าต่าง Resolve
2. ผู้แจ้ง (Reporter) ยืนยันตัวตนด้วย PIN แล้วเซ็นชื่อ
3. ระบบเรียก `submitRequest()` โดยส่ง `initialSignatures` ที่รวบรวมลายเซ็นไว้
4. `submitRequest()` สร้าง Workflow Steps ใน `document_approvals` ผ่าน `generateWorkflowSteps()`
5. `applySignaturesToWorkflow()` ถูกเรียกทันที เพื่อ **Auto-consume** ลายเซ็นที่ได้รับ:
   - แต่ละ Step ที่มีลายเซ็น → อัปเดตสถานะเป็น `approved` พร้อมบันทึก `signature_data`, `approver_id`, `action_at`
   - Comment: `(Auto-approved during Resolve)` บันทึกใน `document_approvals.comment`
   - Log แยกต่างหากบันทึกใน `incident_logs` ทุก Step ด้วย Format: `Approved | อนุมัติขั้นที่ X | [ชื่อผู้อนุมัติ] (Auto-approved during Resolve)`
6. หากลายเซ็นครบทุก Step → ปิดเคส (`Closed`) ทันที และเรียก `onDocumentFinalApproval()`
7. หากลายเซ็นไม่ครบ → สถานะเป็น `Pending Approval` และ Step ถัดไปถูกปลดล็อค (`pending`)

### 10.2 ข้อห้าม (Anti-Patterns)
- ❌ **ห้าม** บันทึกลายเซ็นลงตาราง `incidents` โดยตรงแทน `document_approvals` (ยกเว้นเพื่อ Backward-Compatible Preview เท่านั้น)
- ❌ **ห้าม** สร้าง Workflow Steps แล้วปล่อยให้ทุก Step เป็น `pending`/`waiting` โดยไม่นำลายเซ็นที่มีอยู่แล้วไป Consume
- ❌ **ห้าม** ใช้ `full_name` ในการค้นหาผู้ใช้ (เช่น ใน PIN Verification) — ต้องใช้ UUID หรือ Email เท่านั้น

---

## 11. Reporter Identity Standard (มาตรฐานการระบุตัวตนผู้แจ้ง)

> **บังคับใช้ตั้งแต่ 07-May-2026** — อ้างอิงจาก DEVELOPMENT.md §6

### 11.1 Database Requirement
- ตาราง `incidents` **ต้องมีคอลัมน์** `reported_by_id UUID REFERENCES user_profiles(id)`
- ทุก Insert และ Update ของ Incident **ต้องบันทึก `reported_by_id`** (UUID) ควบคู่กับ `reported_by` (Display Name)
- `reported_by` (text) ใช้เพื่อแสดงผลเท่านั้น ไม่ควรใช้เป็น Key ในการค้นหาหรือยืนยันตัวตน
- Workflow Step ที่มี `role_required = reporter` **ต้อง resolve เป็น `document_approvals.approver_id = incidents.reported_by_id` เสมอ** เพื่อให้ไม่ขึ้นกับ Role จริงของผู้แจ้ง (ผู้แจ้งอาจเป็น `employee`, `it_staff`, `approver`, `admin` หรือ Role อื่นที่มีสิทธิ์สร้างเคส)
- หากมีการแก้ไข Requester (`reported_by_id`) หลังสร้าง Workflow แล้ว ระบบต้อง Sync `approver_id` ของ Step ที่ยัง `pending`/`waiting` และมี `role_required = reporter` ให้ตรงกับ `reported_by_id` ใหม่ ห้ามปล่อยเป็น `NULL` หรือใช้ `role_required = reporter` เป็น Role Pool

### 11.2 Display (Live JOIN)
- หน้า Incident Detail ต้อง **JOIN** `user_profiles` ผ่าน `reported_by_id` สำหรับแสดงชื่อ
- ห้ามอ่าน `reported_by` text โดยตรงสำหรับการแสดงผลหลัก (อาจ Stale หากผู้ใช้เปลี่ยนชื่อ)
- Pattern ที่ถูกต้อง:
  ```js
  .select('*, reporter:user_profiles!incidents_reported_by_id_fkey(id, full_name, email)')
  // แสดงผล: data.reporter?.full_name || data.reported_by
  ```

### 11.3 PIN Verification Lookup Order
ฟังก์ชัน `verifyMemberPIN(userId, pin)` ต้องค้นหาตาม **ลำดับนี้เท่านั้น**:
1. **UUID** (ถ้า `userId` เป็น UUID format)
2. **Email** (ถ้าไม่ใช่ UUID)
3. ❌ **ห้ามใช้ `full_name`** เป็น Fallback — ผิดมาตรฐาน ZERO_HACK_POLICY

---

## 12. Approval Audit Log Standard (มาตรฐานการแสดงประวัติการอนุมัติ)

> **บังคับใช้ตั้งแต่ 07-May-2026**

- ระบบต้องมีหน้า **Approval Audit Log** ที่แสดงทุก Record ใน `document_approvals`
- **1 บรรทัด = 1 Sequence Step** ของ 1 เอกสาร
- เอกสารที่มี 3 Sequence ต้องแสดง **3 บรรทัด** เรียงตาม `step_order`
- ข้อมูลที่แสดงขั้นต่ำ: ประเภทเอกสาร, เลขที่, หัวข้อ, ลำดับที่, บทบาท, ผู้อนุมัติ, สถานะ, วันที่
- ต้องรองรับการ Filter ตามสถานะ (approved / pending / waiting)
- Server Action: `getApprovalAuditLog()` ใน `app/actions/workflow.js`

---

## 13. Transactional Workflow Standard (การทำงานแบบ Transaction)

> [!IMPORTANT]
> การอัปเดตสถานะ Workflow ที่มีการเปลี่ยนแปลงหลายตารางพร้อมกัน **ต้อง** ทำงานผ่าน Database Transaction เสมอ

- **Pattern**: ใช้ PostgreSQL RPC Function (`handle_approval_step`)
- **ความรับผิดชอบของ RPC**:
    1. อัปเดตสถานะ Step ปัจจุบันใน `document_approvals`
    1.1. บันทึก `verified_by_pin = true` เมื่อเป็น Remote Approval หรือมีการยืนยันตัวตนด้วย PIN
    2. ค้นหาและปลดล็อค Step ถัดไป (ถ้ามี)
    3. อัปเดตสถานะเอกสารในตารางหลัก (Incident/Checklist) หากเป็นขั้นตอนสุดท้าย
    4. บันทึก Log ลงใน `system_audit_logs`
- **ข้อดี**: ป้องกันข้อมูลไม่ตรงกัน (Race Condition/Partial Failures)

## 14. Centralized Audit Log Standard (มาตรฐาน Log กลาง)

- **Source of Truth**: ทุกกิจกรรมสำคัญต้องบันทึกลง `system_audit_logs`
- **Schema**:
    - `doc_id`: UUID ของเอกสาร
    - `doc_type`: ประเภท (`incident`, `checklist`, `user`)
    - `action`: ประเภทกิจกรรม (`Approved`, `Rejected`, `Submitted`, `Updated`)
    - `details`: รายละเอียดที่อ่านเข้าใจง่าย
    - `metadata`: ข้อมูลเชิงเทคนิค (JSONB)
- **UI Integration**: หน้า Dashboard และ Logs ต้องดึงข้อมูลจากตารางนี้เป็นหลัก

---

> [!IMPORTANT]
> **"ความแม่นยำและมาตรฐาน คือหัวใจของระบบเรา"**
> ผู้พัฒนา (AI และมนุษย์) ต้องอ่านและปฏิบัติตามมาตรฐานนี้ในทุกการแก้ไขโค้ด (Git Commit/Code Update) โดยไม่มีข้อยกเว้น

---
*Last Updated: 08-May-2026 15:45 — Added §13 Transactional Workflow, §14 Centralized Logging (Phase 2 Refinement)*
