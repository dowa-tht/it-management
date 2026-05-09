# 🛠️ แผนการ Refactor: ระบบการสร้าง Incident (Zero-Hack Compliance)

เอกสารฉบับนี้จัดทำขึ้นเพื่อให้ Agent (Developer) ดำเนินการแก้ไขระบบการสร้าง Incident ให้เป็นไปตามมาตรฐานความปลอดภัยระดับสูงสุดของระบบ DOWA IT

---

## 🎯 วัตถุประสงค์ (Goals)
1.  **Zero-Hack Enforcement**: ย้ายการเขียนข้อมูลลง Database จากฝั่ง Client-side ไปยัง Server-side (Server Actions) ทั้งหมด
2.  **Unified Workflow Integration**: เริ่มบันทึกขั้นตอนการอนุมัติ (Workflow Steps) ทันทีที่สร้างเอกสาร
3.  **Data Integrity**: รวมการบันทึกเอกสารหลัก และการบันทึก Logs (Incident/Checklist) ไว้ใน Transaction เดียวกันที่ฝั่ง Server

---

## 📂 ไฟล์ที่ต้องดำเนินการ (Target Files)

### 1. [NEW] `app/actions/incidents.js`
สร้าง Server Action ใหม่ชื่อ `createIncident` เพื่อรับช่วงต่อจาก Frontend:
- **Input**: ข้อมูลจากฟอร์ม (Title, Desc, Severity, Reporter, etc.)
- **Logic**:
    1.  ดึงเลขที่เอกสารล่าสุด (`getNextNo`) และอัปเดต (`updateLastNo`)
    2.  บันทึกข้อมูลลงตาราง `incidents`
    3.  เรียกใช้ `generateWorkflowSteps` จาก `workflow.js` เพื่อเริ่มระบบอนุมัติ
    4.  บันทึก Log ลงตาราง `incident_logs`
    5.  หากมีการอ้างอิง Checklist ให้บันทึก Log กลับไปยังตาราง `checklist_logs` ด้วย
- **Output**: `{ success: true, docId: UUID }`

### 2. [MODIFY] `app/dashboard/incidents/new/page.js`
- ลบการเรียก `supabase.from('incidents').insert(...)` และ `incident_logs` ออกทั้งหมด
- เปลี่ยนมาเรียกใช้ `createIncident` (Server Action) ที่สร้างขึ้นใหม่
- จัดการหน้าจอ Loading และ Redirect เมื่อสำเร็จ

---

## 📝 ขั้นตอนการทำงานสำหรับ Agent (Developer Instructions)

### Step 1: สร้าง Server Action
ย้าย Logic จากฟังก์ชัน `handleSubmit` ใน `new/page.js` (บรรทัด 184-239) ไปไว้ที่ Server Action:
- ตรวจสอบให้มั่นใจว่าใช้ `adminClient` (Service Role) ในการจัดการข้อมูลที่สำคัญ
- อย่าลืมดึง `session` ของผู้ใช้ปัจจุบันเพื่อระบุ `created_by` ให้ถูกต้อง

### Step 2: เชื่อมต่อ Workflow
ในฟังก์ชัน `createIncident` ต้องมีการเรียก:
```javascript
await generateWorkflowSteps(docId, 'incident', 'severity', severityValue);
```
เพื่อให้ระบบอนุมัติเริ่มทำงานทันทีตามระดับความรุนแรง (Severity)

### Step 3: ปรับปรุง Frontend
- อัปเดตฟังก์ชัน `handleSubmit` ให้เรียก Server Action แทน
- ตรวจสอบว่า `UserAutocomplete` ส่งข้อมูล `reported_by_id` กลับมาถูกต้อง

---

## ✅ การตรวจสอบผลงาน (Verification)
1.  **Database Check**: เมื่อสร้างเคสแล้ว ต้องมีข้อมูลปรากฏในตาราง `incidents`, `incident_logs` และ `document_approvals` (ลำดับที่ 1 ต้องขึ้นสถานะ Pending ทันที)
2.  **No Series Check**: เลขที่เอกสารต้องรันต่อไปอย่างถูกต้อง
3.  **Cross-Log Check**: หากเปิดเคสจาก Checklist ต้องมี Log ปรากฏในทั้งสองโมดูล

---
*จัดทำแผนโดย: Project Checker (DOWA IT System)*
*วันที่: 08-May-2026*
