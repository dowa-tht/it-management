# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 19 พฤษภาคม 2569 (19-May-2026)
- **📌 สิ่งที่ต้องดำเนินการต่อ/แจ้งเตือนผู้ใช้งานในวันพรุ่งนี้ (Next Day Reminders & Pending Tasks):**
  - **09:31 +07:00 | MODEL SUITABILITY CHECK (ALL AGENTS):** เพิ่มข้อบังคับตรวจความเหมาะสมของ model ทุก prompt และต้องรอการยืนยันจาก USER เมื่อ model ไม่เหมาะกับงานความเสี่ยงสูง
    - อัปเดต [AGENTS.md](AGENTS.md:1) เพิ่มหัวข้อ `Model Suitability Check (Mandatory)` พร้อม format แจ้งเตือน `> [!IMPORTANT] Model Suitability Alert`
    - อัปเดต [.julesrules](.julesrules:40) เพิ่มกฎบังคับเดียวกัน เพื่อให้ Google Jules หยุดถามยืนยันก่อนลงมือเมื่อ model ไม่เหมาะกับงาน Critical/Complex Debug/Security
    - เพิ่ม default model mapping: Quick = fast model, Standard = coding/balanced model, Critical/Complex Debug/Security = high-reasoning model
  - **09:40 +07:00 | PHOTO COMPRESSION & ONEDRIVE RETAKE CLEANUP:**
    - พัฒนาระบบบีบอัดภาพหลักฐานด้วย HTML5 Canvas บน Client-side ให้จำกัดความยาวด้านสูงสุดที่ `1000px` (ยืดหยุ่นทั้งแนวตั้งและแนวนอนด้วย `Math.max`) และลดคุณภาพการบีบอัดลงมาที่ `0.5` ในไฟล์ `app/dashboard/checklist/[id]/page.js` ช่วยลดขนาดรูปภาพลงกว่า 50% (ประหยัดแบนด์วิดท์เหลือเพียง ~50-90KB ต่อรูป)
    - เพิ่มกระบวนการลบรูปเก่าออกจาก Microsoft OneDrive อย่างปลอดภัย โดยตรวจหา `oldFilePath` ( OneDrive File ID เดิม) และเรียก `DELETE /api/upload/onedrive` แบบ Asynchronous ในพื้นหลัง (Background Fetch) ทันทีที่การอัปโหลดรูปภาพใหม่สำเร็จ เพื่อป้องกันการทิ้งไฟล์ขยะ (Orphaned Files) บน OneDrive
  - **09:55 +07:00 | ONEDRIVE RETAKE DUPLICATE ID BUG FIX:**
    - แก้ไขปัญหาบั๊กที่ถ่ายรูปใหม่ซ้ำแบบเดิม 2 ครั้งจึงจะสำเร็จ โดยหาสาเหตุพบว่า เกิดจาก OneDrive Graph API เมื่ออัปโหลดไฟล์ที่มีชื่อเดิมซ้ำ ระบบจะทำการเขียนทับเนื้อหาเดิมโดยยังรักษา File ID เดิมเอาไว้ (เช่น `1234`) ส่งผลให้ `oldFilePath` และ `resJ.filePath` มีค่า ID เดียวกัน และเมื่อกระบวนการ Asynchronous Deletion ทำงานเบื้องหลัง ระบบจึงส่งคำสั่งลบ ID นั้นออกไป ทำให้ไฟล์รูปภาพที่เพิ่งอัปโหลดใหม่ถูกลบออกไปด้วย
    - วิธีการแก้ไข: (1) ปรับปรุงชื่อไฟล์ที่ส่งไป OneDrive ให้มีความเป็นเอกลักษณ์เฉพาะตัว (Unique) ด้วยการต่อท้ายด้วย Timestamp `checklist_${item.id}_${pointIdx}_${Date.now()}.jpg` ทำให้ OneDrive สร้าง File Item ใหม่ที่ได้ ID ใหม่เสมอ และ (2) เพิ่มมาตรการป้องกันเชิงรุก (Defense in Depth) ด้วยการเช็กว่า ID เก่าและใหม่ต้องไม่ตรงกันก่อนส่งคำสั่งลบ: `if (oldFilePath && oldFilePath !== resJ.filePath)` ในไฟล์ `app/dashboard/checklist/[id]/page.js`
  - **10:45 +07:00 | SYSTEM ARCHITECTURE & WORKFLOW UPGRADE:**
    - **Zero-Downtime Upgrade (Phase 1 to 4 Full Cutover)**: 
      - `app/actions/workflow.js`: Implemented Dynamic Step Resolution based on `role_required`. Removed legacy hardcoded step loop (`step_order` 1, 2, 3) and fully transitioned to dynamic role-based logic.
      - `lib/workflow.js`: Switched `validateSignaturePin` to use `verifyEmployeePIN` Server Action directly for secure PIN validation, removing the legacy `fetch` API call.
      - `lib/workflowRegistry.js`: Added CRITICAL contract block to prevent structural changes to `WORKFLOW_DOC_REGISTRY` without corresponding DB RPC migrations.
      - `app/dashboard/settings/workflow/page.js`: Added UI Guardrails to prevent removal of `reporter` role from Incident workflows, ensuring zero breakages during step configuration. Added "ROLE-BASED DYNAMIC LOGIC" indicator.
    - พัฒนาระบบแจ้งเตือนและยกระดับระบบการทำงาน (Workflow Engine UX Upgrade) ด้วยโมดูลกลาง `WorkflowNotification` (`components/workflow/WorkflowNotification.js`)
    - สร้าง Custom Modal, Alert, และ Toast แจ้งเตือนแบบ Premium Glassmorphism ที่แสดงสถานะขออนุมัติ, ตีกลับเอกสาร, อนุมัติสำเร็จ และการทำงานผิดพลาดของ API ได้อย่างสวยงามตามหลักสรีรศาสตร์
    - ปรับปรุงให้หน้าจอ Checklist และ Incident ในทุกๆ Workflow Actions (ส่งขออนุมัติ, อนุมัติ, ตีกลับ, เปิดใหม่, รับทราบเคส) ทำการเรียก `fetchData()` ควบคู่กับ `router.refresh()` ทันทีเพื่อทำ Auto-Refresh ข้อมูลบนหน้าจอโดยไม่ต้องกด Refresh ตัวเองของ User
    - กำจัดคำสั่ง `alert()` แบบเดิมๆ ใน Workflow State Handling ออกทั้งหมดเพื่อความสวยงามและความพรีเมียมระดับองค์กร
  - **15:20 +07:00 | INCIDENT CREATOR & REQUESTER SEPARATION:**
    - แยกบทบาทระหว่าง "ผู้สร้างเอกสาร (Creator)" และ "ผู้แจ้งปัญหา (Requester)" ในระบบ Incident Management ออกจากกันอย่างสมบูรณ์
    - **Database Migration**: รันคำสั่งเพิ่มคอลัมน์ `created_by` และ `created_by_id` ลงในตาราง `incidents` และ Backfill ข้อมูลเก่าจากตาราง `system_audit_logs` เรียบร้อยแล้ว (Migration Script เก็บไว้ที่ `docs/history/incident_creator_migration.sql`)
    - **Workflow Logic**: `app/actions/workflow.js` อัปเกรดให้สามารถแยกแยะ Dynamic Role ของ `creator` ออกจาก `reporter` ได้ ทำให้สามารถส่งขออนุมัติตามสายงานของ "ผู้สร้าง" ได้อย่างถูกต้อง
    - **UI Updates**:
      - `app/dashboard/settings/workflow/page.js`: เพิ่มตัวเลือก `creator` ลงใน Workflow Setup dropdown และอัปเดต Guardrails
      - `app/dashboard/incidents/page.js`: เปลี่ยนชื่อ Label แสดงผลผู้แจ้งใน List View ให้ชัดเจนขึ้น
      - `app/dashboard/incidents/[id]/page.js`: เพิ่มฟิลด์การแสดงข้อมูล "ผู้สร้าง / Creator" ในรายละเอียด Incident หน้า Detail View
  - **16:00 +07:00 | WORKFLOW SETTINGS UI REFACTOR & LEGACY APPROVAL FLOWS CLEANUP:**
    - ปรับปรุงการแสดงผล Role Options ใน Workflow Settings โดยระบุประเภทอย่างชัดเจนต่อท้ายบทบาท เช่น `(System Role)` หรือ `(Dynamic Role)` เพื่อความเข้าใจง่าย
    - ปรับปรุงเนื้อหา Workflow Guide Fallback Text ในหน้าจอตั้งค่า โดยเพิ่มคำอธิบายของ System Roles และ Dynamic Roles พร้อมทั้งยกตัวอย่างและอธิบายการทำงานของ Creator และ Reporter
    - เพิ่มเติมข้อมูลของระดับเงื่อนไขการจัดเส้นทางอนุมัติ (Approval Routing Conditions) ทั้งแบบ Checklist (Daily/Weekly/Monthly/Yearly) และ Incident (Low/Medium/High) รวมถึงกฎการอนุมัติอัตโนมัติ (Auto-Approval Rules) เมื่อไม่มีขั้นตอนอนุมัติกำหนดไว้ ครบถ้วนครอบคลุมทุกสถานการณ์
    - ลบหน้าจอระบบการตั้งค่าการอนุมัติเดิม (Legacy Approval Flows) ที่ซ้ำซ้อนออกทั้งหมด โดยลบไฟล์ `app/dashboard/settings/approvals/page.js`, ลบลิงก์เชื่อมโยงออกจาก `app/dashboard/layout.js` และลบสิทธิ์การเข้าถึงใน `lib/auth.js`

---

## 📦 บันทึกย้อนหลัง (Archives)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_18.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_18.md)
- [CHANGELOG_2026_05_17.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_17.md)
- [CHANGELOG_2026_05_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_15.md)
- [CHANGELOG_2026_05_14.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_14.md)
- [CHANGELOG_2026_05_13.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_13.md)
- [CHANGELOG_2026_05_12.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_12.md)
- [CHANGELOG_2026_05_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_11.md)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 19-May-2026 16:00*
- ปรับปรุง `submitRequest` ใน `app/actions/workflow.js` ให้ใช้ `session.user.id` เป็นผู้อนุมัติเอกสาร กรณีที่เอกสารไม่มี Workflow Rules (autoApproved = true)
- เพิ่มปุ่ม "+ เพิ่มเงื่อนไขใหม่" แบบมี Modal แทนของเดิมที่เป็น Coming Soon
- ใน Modal มี 2 Tabs ได้แก่ Incident และ Checklist
- แสดงรายการเงื่อนไขทั้งหมดตามประเภท (เช่น Low, Medium, High)
- รายการที่มีการตั้งค่าอยู่แล้วในระบบจะถูกแสดงเป็น Disabled
- เมื่อคลิกเลือกเงื่อนไขใหม่ จะปิด Modal และนำไปยังเงื่อนไขนั้นพร้อมให้เริ่มเพิ่มขั้นตอนได้ทันที
- ซ่อน Dropdown "ระบุผู้อนุมัติเฉพาะเจาะจง" กรณีเลือก Role เป็น Dynamic Roles (Creator, Reporter)
- บังคับการเลือก Dropdown "ระบุผู้อนุมัติเฉพาะเจาะจง" กรณีมี Role เหมือนกันใน Workflow เดียวกัน
- ป้องกันการเลือก "ผู้อนุมัติเฉพาะเจาะจง" ซ้ำกันใน Workflow เดียวกัน
- แสดงข้อความเตือนเมื่อเกิด Error สีแดงและปิดการใช้งานปุ่มบันทึกจนกว่าจะแก้ปัญหาครบ
