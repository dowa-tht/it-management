# 🛡️ มาตรฐานการควบคุมสิทธิ์ (RBAC Standard - Final Version)

เอกสารฉบับนี้กำหนดโครงสร้าง Role และสิทธิ์การใช้งานใหม่ทั้งหมด เพื่อความชัดเจนในการพัฒนาและการตรวจสอบระบบ

---

## 1. รายการ Role มาตรฐาน (Standard Roles)

ระบบเปลี่ยนมาใช้ชื่อเรียกที่ตรงตามวัตถุประสงค์การใช้งานจริง ทั้งในระดับ Database, Code และ UI ดังนี้:

| ชื่อระบบ (Code/DB) | ชื่อแสดงผล (Display) | วัตถุประสงค์ (Purpose) |
| :--- | :--- | :--- |
| **`admin`** | **Administrator** | ผู้ดูแลระบบสูงสุด (จัดการสิทธิ์และตั้งค่า) |
| **`it_staff`** | **IT Team** | เจ้าหน้าที่ IT (ปฏิบัติงาน Checklist, Backup, แก้ Incident) |
| **`employee`** | **Employee** | พนักงานทั่วไป (เปิด Incident และติดตามงานของตนเอง) |
| **`auditor`** | **Auditor** | ผู้ตรวจสอบ (ดูข้อมูลได้ทุกโมดูลแบบ Read-Only) |
| **`approver`** | **Approver** | ผู้อนุมัติ (ผู้จัดการแผนกที่ต้องเซ็นชื่อรับรองเอกสาร) |

---

## 2. Permission Matrix (สิทธิ์การเข้าถึง)

| ฟีเจอร์ (Feature) | admin | it_staff | employee | auditor | approver |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Incident (Manage)** | ✅ RW | ✅ RW | ❌ | ✅ RO | ❌ |
| **Incident (My Tickets)** | ✅ RW | ✅ RW | ✅ RW | ✅ RO | ✅ RO |
| **Checklist (Execute)** | ✅ RW | ✅ RW | ❌ | ✅ RO | ❌ |
| **Backup Log (Manage)** | ✅ RW | ✅ RW | ❌ | ✅ RO | ❌ |
| **System Logs (Audit)** | ✅ RO | ✅ RO | ❌ | ❌ | ❌ |
| **User Settings** | ✅ RW | ❌ | ❌ | ❌ | ❌ |

**กฎการกรองข้อมูล (Data Isolation):**
-   **`employee`**: จะเห็นเฉพาะ Incident ที่ตนเองเป็นคนแจ้ง (`reported_by_id`) หรือที่เป็นคนสร้างเท่านั้น
-   **`it_staff`**: จะเห็นงานทั้งหมดที่เกี่ยวข้องกับฝ่าย IT เพื่อการปฏิบัติงาน
-   **`auditor`**: เห็นข้อมูลตามขอบเขตการตรวจสอบแบบ Read-Only และต้องไม่สามารถ create/update/delete ข้อมูลใน `incident` / `checklist`

---

## 3. ข้อกำหนดด้านความปลอดภัย (Security Rules)

1.  **Strict Typing**: ห้ามใช้คำว่า `guest`, `visitor`, `member` หรือ `supervisor` ในโค้ดอีกต่อไป ให้ใช้ชื่อตามตารางด้านบนเท่านั้น
2.  **Server-side Enforcement**: การเช็คสิทธิ์ (Check Permission) ต้องทำที่ Server Action ทุกครั้งก่อนเข้าถึงข้อมูล
3.  **Audit Trail**: ทุกการเปลี่ยนแปลงสิทธิ์ (Change Role) ต้องถูกบันทึก Log โดยระบุชื่อ Admin และสาเหตุของการเปลี่ยนแปลงเสมอ
4.  **RLS Alignment**: สิทธิ์ Read-Only ของ `auditor` ต้องถูกบังคับทั้งใน UI และ RLS; ห้ามใช้ read helper เดียวกันกับ write policy โดยตรง

---
*จัดทำโดย: Project Checker (DOWA IT System)*
*เวอร์ชัน: 3.0 (Final Migration Standard: 08-May-2026)*
