# 🛡️ รายงานการตรวจสอบคุณภาพ (Quality Audit Report)
**Project:** DOWA IT System  
**Module:** Incident Management (Create, Edit, Resolve, Approval)  
**Auditor:** Quality (AI Agent)  
**Date:** 2026-05-09

---

## 1. ผลการตรวจสอบภาพรวม (Summary)
จากการตรวจสอบ Source Code ในส่วนของ `app/dashboard/incidents/` และ `app/actions/incidents.js`, `workflow.js` พบว่าระบบมีการวางโครงสร้างที่ดีตามมาตรฐาน **Unified Workflow v2** แต่ยังมี **Bug ระดับ Critical** ในส่วนของการยืนยันตัวตน และจุดที่ไม่สอดคล้องกับมาตรฐาน (Non-compliance) หลายประการที่อาจส่งผลต่อความถูกต้องของ Audit Trail

---

## 2. รายการ Bug ที่พบ (Bugs Identified)

### 🔴 [CRITICAL] PIN Verification Bypass (Security Vulnerability)
*   **ไฟล์:** `app/dashboard/incidents/[id]/page.js:L256` และ `app/actions/workflow.js:L563`
*   **อาการ:** ในหน้าจอ Resolve แม้จะมีการบังคับให้กรอก PIN ของผู้แจ้ง (Reporter PIN) แต่ใน Server Action `submitRequest` กลับไม่มีการส่ง PIN ไปตรวจสอบจริง และฟังก์ชัน `applySignaturesToWorkflow` ก็ทำการบันทึกลายเซ็นลงใน Workflow Step ทันทีโดยไม่มีการ Verify
*   **ผลกระทบ:** ใครก็ได้ที่เข้าถึงหน้าจอนี้สามารถเซ็นชื่อแทนผู้แจ้งได้โดยไม่ต้องรู้ PIN จริง (Bypass Security Control)

### 🟠 [MAJOR] Workflow Configuration Mismatch on Severity Change
*   **ไฟล์:** `app/dashboard/incidents/[id]/page.js:L232`
*   **อาการ:** เมื่อมีการแก้ไขระดับความรุนแรง (Severity) ของ Incident ในหน้า Detail ระบบจะบันทึกค่าใหม่ลงตาราง `incidents` แต่ **ไม่ทำการสร้าง Workflow Steps ใหม่**
*   **ผลกระทบ:** หากเปลี่ยนจาก Low (1 Step) เป็น High (3 Steps) ระบบจะยังคงยึดตาม Step เดิมที่ถูกสร้างไว้ตอน Create ทำให้การอนุมัติไม่ครบถ้วนตามความเสี่ยงที่แท้จริง

### 🟡 [MINOR] Missing Identity Mapping in Resolve Signatures
*   **ไฟล์:** `app/dashboard/incidents/[id]/page.js:L588-L589`
*   **อาการ:** ข้อมูลลายเซ็นที่ส่งจาก UI ระบุชื่อเป็น Hardcoded string (`'IT Officer'`, `'Reporter'`) แทนที่จะเป็นข้อมูลจริงจาก Profile (ID, Email)
*   **ผลกระทบ:** ข้อมูลใน `document_approvals` และ `system_audit_logs` จะแสดงชื่อผู้เซ็นไม่ถูกต้อง หรือขาดความเชื่อมโยงกับฐานข้อมูล User

---

## 3. การออกแบบเทียบกับมาตรฐาน (Standard Compliance)

| หัวข้อตรวจสอบ | สถานะ | ข้อสังเกตจากหลักฐาน (Evidence) |
| :--- | :---: | :--- |
| **Identity Standard (§11.1)** | ⚠️ | ใน `createIncident` ไม่มีการบังคับใส่ `reported_by_id` หาก UI ส่งมาไม่ครบ (เสี่ยงต่อ Data Integrity) |
| **Status Flow (§1.0)** | ✅ | การสลับสถานะ Open -> In Progress -> Pending Approval ทำได้ถูกต้องตาม Logic |
| **Unified Workflow v2 (§10.1)** | ⚠️ | ระบบสร้าง Workflow Steps ตั้งแต่ตอน **Create** (`incidents.js:L65`) แทนที่จะสร้างตอน **Resolve** ตามมาตรฐาน ซึ่งอาจทำให้ข้อมูล Workflow ล้าสมัยหาก Severity เปลี่ยนแปลง |
| **Centralized Logging (§14.0)** | ✅ | มีการใช้ `system_audit_logs` และ `recordLog` ครอบคลุมกิจกรรมหลัก |
| **Transactional UI (§13.0)** | ✅ | มีการใช้ PostgreSQL RPC (`handle_approval_step`) สำหรับการอนุมัติทีละขั้นตอน |

---

## 4. ข้อเสนอแนะเพื่อความเหมาะสมกับ Flow งานจริง (Recommendations)

1.  **Refactor Step Generation:** ควรย้ายการเรียก `generateWorkflowSteps` จาก `createIncident` ไปไว้ใน `submitRequest` (ตอน Resolve) เพื่อให้ Workflow Steps ถูกสร้างตามความจริง ณ ขณะที่งานเสร็จสิ้น
2.  **Implement PIN Verification in Resolve:** ต้องแก้ไข `submitRequest` ให้รับค่า PIN และเรียก `verifyEmployeePIN` ก่อนจะยอมให้ `applySignaturesToWorkflow` ทำงาน
3.  **Automatic Workflow Reset on Severity Change:** หากมีการเปลี่ยน Severity ในขณะที่สถานะยังไม่เป็น Closed ระบบควรแจ้งเตือนและทำการ Re-generate Workflow Steps ใหม่โดยอัตโนมัติ
4.  **Enforce reported_by_id:** ใน Server Action ควรดึง `userId` จาก Session มาแสตมป์เป็น `reported_by_id` เสมอหากไม่มีการระบุมา เพื่อป้องกันเคส "กำพร้า (Orphan records)"

---

### 📝 สรุปสถานะการตรวจสอบ: **FAILED (Needs Urgent Fixes)**
> [!CAUTION]
> เนื่องจากพบช่องโหว่ด้านความปลอดภัยในการ Bypass PIN และ Bug ในการเปลี่ยน Severity ซึ่งเป็นหัวใจสำคัญของระบบ IT Audit จึงขอแนะนำให้ระงับการ Go-live ในส่วนนี้จนกว่าจะได้รับการแก้ไขตามข้อเสนอแนะข้างต้น
