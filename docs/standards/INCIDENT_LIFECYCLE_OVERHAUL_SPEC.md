# 🛠️ Technical Spec: Incident Lifecycle Overhaul

**Version:** 1.0  
**Status:** Approved for Development  
**Target Module:** Incident Management & Unified Workflow Engine

## 1. Overview
ปรับปรุงกระบวนการทำงาน (Lifecycle) ของ Incident ให้เป็นไปตามมาตรฐานสากล โดยแบ่งแยกหน้าที่ชัดเจนระหว่างผู้แจ้ง (Member) และผู้ปฏิบัติงาน (IT/Admin) และเพิ่มความปลอดภัยในการอนุมัติผ่านระบบ Remote Approval

---

## 2. Phase 1: Simplified Creation UI
**เป้าหมาย:** สมาชิกต้องแจ้งเคสได้ง่ายและรวดเร็วที่สุด

### 2.1 File: `app/dashboard/incidents/new/page.js`
- **Fields to Keep:** หัวข้อ (Title), รายละเอียด (Description), ประเภท (Category), ระบบ (Affected System).
- **Default Values:** 
    - `severity`: "Medium"
    - `status`: "Open"
- **Fields to Remove/Hide:**
    - `assigned_to`: ห้ามเลือกในขั้นตอนนี้
    - `SLA Widget`: ไม่ต้องแสดงผลในหน้าสร้าง
- **Logic:** บันทึกข้อมูลพื้นฐานลงในตาราง `incidents` โดย `reported_by_id` ต้องดึงมาจาก User Session ปัจจุบัน

---

## 3. Phase 2: Formal Acknowledge Flow
**เป้าหมาย:** บังคับให้มีการรับเคสอย่างเป็นทางการก่อนดำเนินการแก้ไข

### 3.1 File: `app/actions/incidents.js` -> `acknowledgeIncident`
- **Parameters:** `(incidentId, severity, assigneeId)`
- **Updates:**
    - `status`: "In Progress"
    - `severity`: อัปเดตตามที่ IT ประเมินใหม่ (หากมีการเปลี่ยน)
    - `assigned_to_id`: ID (UUID) ของผู้รับผิดชอบ (Default คือผู้ที่กดปุ่ม)
    - `assigned_to`: ชื่อเต็มของผู้รับผิดชอบ (Snapshot ณ เวลาที่รับเรื่อง)
    - `assigned_at`, `acknowledged_at`: บันทึกเวลาปัจจุบัน (Timestamp)
- **SLA Trigger:** การบันทึก `acknowledged_at` จะเป็นจุดสิ้นสุดของ Response SLA และจุดเริ่มต้นของ Resolution SLA

### 3.2 File: `app/dashboard/incidents/[id]/page.js`
- **UI:** เมื่อสถานะเป็น "Open" ให้แสดงปุ่ม **"Acknowledge (รับเรื่อง)"** ใน WorkflowActionBar
- **Modal:** เมื่อกดปุ่ม ให้แสดง Modal เพื่อยืนยัน/แก้ไข Severity และ Assignee
- **Constraint:** ปุ่ม "ส่งอนุมัติ (Resolve)" ต้องถูก Disable จนกว่าสถานะจะเปลี่ยนเป็น "In Progress"

---

## 4. Phase 3: Streamlined Resolution (No-Image Submit)
**เป้าหมาย:** ลดความยุ่งยากในการส่งงานโดยไม่ใช้การวาดลายเซ็นสำหรับผู้ปฏิบัติงาน

### 4.1 File: `app/actions/workflow.js` -> `submitRequest`
- **Logic Change:** ปรับให้รองรับการส่งงานโดยบันทึกเพียง **Full Name** และ **Timestamp** ลงใน Audit Log/Signatures แทนรูปภาพ (Data URL)
- **Metadata:** บันทึก `submission_mode: "log_based"` เพื่อระบุว่าเป็นการส่งงานแบบไม่ต้องวาดรูป

### 4.2 File: `app/dashboard/incidents/[id]/page.js` -> `ResolveDialog`
- **UI:** นำ Signature Pad ออกสำหรับขั้นตอนการส่งงาน (Submission)
- **Fields:** ยังคงต้องกรอก Root Cause, Resolution, และ Corrective Action ให้ครบถ้วน

---

## 5. Phase 4: Advanced Approval Workflow
**เป้าหมาย:** รองรับการอนุมัติด้วยตนเองและการอนุมัติแทน (Proxy)

### 5.1 Mode A: Self-Approval
- **Condition:** `currentUser.id === currentStep.approver_id` หรือมี Role ตรงตามที่กำหนด
- **UI:** แสดงปุ่ม **Approve** และ **Reject** พร้อมช่องกรอก Comment
- **Action:** ไม่ต้องวาดลายเซ็น ระบบจะใช้ชื่อจาก Profile และเวลาปัจจุบันบันทึกเป็นลายเซ็นดิจิทัล

### 5.2 Mode B: Remote Approval (Proxy)
- **Condition:** Admin หรือ IT ดำเนินการแทนผู้อื่น
- **UI:** แสดงหน้าจอสำหรับวาดลายเซ็น (Signature Pad) และช่องระบุ **PIN 6 หลัก** ของผู้อนุมัติตัวจริง
- **Verification:** ต้องเรียก `verifyEmployeePIN` ก่อนบันทึกผล

### 5.3 Step Transition
- **Logic:** เมื่อ Approver คนสุดท้ายอนุมัติ ให้เปลี่ยนสถานะ Incident เป็น **"Approved"** (หรือ Closed ตามที่ Standard กำหนด)

---

## 6. Technical Guidelines for Development Agent
1. **Reuse Unified Components:** ใช้ `UnifiedApprovalModal` และ `WorkflowActionBar` เป็นหลัก ห้ามสร้างคอมโพเนนต์ทับซ้อน
2. **Workflow Engine Compatibility:** การแก้ไขใน `actions/workflow.js` ต้องไม่กระทบระบบ Checklist (ตรวจสอบ `ref_type`)
3. **Evidence-Based Dev:** ทุกครั้งที่แก้ไขโค้ดเสร็จ ต้องระบุชื่อไฟล์และบรรทัดที่เปลี่ยนแปลงใน Walkthrough
4. **Zero UI Hacks:** ห้าม Hardcode ค่าสถานะใน UI ให้ใช้ค่าจาก Database/Registry เท่านั้น

---
**เอกสารอ้างอิง:**
- [INCIDENT_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INCIDENT_MANAGEMENT.md)
- [SLA_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SLA_MANAGEMENT.md)
- [implementation_plan.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/835097b2-a78a-42be-a5ce-1e84542b3b6d/implementation_plan.md)
