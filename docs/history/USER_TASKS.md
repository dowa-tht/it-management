# 📋 รายการงาน (Task Tracker)

**อัปเดตล่าสุด:** 14 พฤษภาคม 2569 (06:20 น.)

---

## ✅ งานที่เสร็จสิ้นแล้ว (Completed)

### 1. Incident Accept/Dispatch Audit-Safe Workflow
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:**
  - `it_staff` สามารถกด Accept รับงานเป็นของตนเองได้เท่านั้น
  - `admin` สามารถ Dispatch มอบหมายงานให้ `it_staff` ได้ (ต้องเลือกผู้รับผิดชอบก่อน)
  - แยก Audit Log ระหว่าง "รับเรื่อง (Acknowledge)" และ "มอบหมายงาน (Dispatch)"
  - Server-side validation ตรวจสอบ role, active status, severity และ concurrency guard
  - UI ซ่อนปุ่ม Accept/Dispatch จาก role ที่ไม่มีสิทธิ์ (employee, auditor)
  - Assignee indicator ในหน้า Account Management เป็น read-only อ้างอิงจาก role `it_staff`
  - อัปเดตเอกสารมาตรฐาน `INCIDENT_MANAGEMENT.md` และ `PERMISSIONS.md`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/actions/incidents.js` — `acknowledgeIncident()` พร้อม role validation
  - `components/workflow/WorkflowActionBar.js` — `canAcknowledge`, `acknowledgeLabel` props
  - `app/dashboard/incidents/[id]/page.js` — `AcknowledgeDialog` แยก flow ตาม role
  - `app/dashboard/settings/users/page.js` — Assignee read-only derived from role

### 2. แก้ไข revalidatePath Error ใน Admin Actions
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** เพิ่ม import `revalidatePath` จาก `next/cache` ใน `app/actions/admin.js` เพื่อแก้ runtime error หลัง `updateAdminUser()`

### 3. ลบ Dev Cache และ Restart Server
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** ลบ `.next` และ restart dev server เพื่อแก้ 404 error ที่ `/dashboard/settings/no-series`

### 4. ตรวจสอบและอัปเดต User Role
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** อัปเดต `natthawut@dowa-tht.co.th` เป็น role `it_staff` และ `can_be_assignee = true` สำเร็จ

### 5. สร้าง RLS Migration Script
- **สถานะ:** ✅ เสร็จสมบูรณ์ (ยังไม่ได้ apply กับ production)
- **วันที่:** 13 พฤษภาคม 2569
- **รายละเอียด:** สร้างไฟล์ `supabase/migrations/add_rls_policies.sql` สำหรับเปิด RLS บน 18 ตารางที่ยังปิดอยู่

### 6. อัปเดต Project Agent Rules
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 13 พฤษภาคม 2569
### 7. Settings Audit Remediation (TASK-001 ถึง TASK-003)
- **สถานะ:** ✅ เสร็จสมบูรณ์
- **วันที่:** 14 พฤษภาคม 2569
- **รายละเอียด:**
  - `TASK-001` เสริม Guide และ Content ให้ครบทุกหน้าใน Settings ผ่าน `MasterDataScope.js` และ `Holidays` page
  - `TASK-002` ปรับแต่ง CSS Table Wrapper สำหรับ Master Data และ Checklist เพื่อรองรับ Mobile horizontal scroll
  - `TASK-003` ตรวจสอบ RLS Policy ยืนยันความปลอดภัยของตาราง `holidays` และ `checklist_procedure_plans`
- **ไฟล์ที่เกี่ยวข้อง:**
  - `app/dashboard/settings/_components/MasterDataScope.js`
  - `app/dashboard/settings/holidays/page.js`
  - `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md`

---

## 🔄 งานที่กำลังดำเนินการ (In Progress)

> ไม่มีงานที่กำลังดำเนินการในขณะนี้

---

## 📌 งานที่รอดำเนินการ (Pending)

> ไม่มีงานที่รอดำเนินการในขณะนี้

---

## 📝 หมายเหตุ (Notes)

- ระบบ Build ผ่านสำเร็จ (56 routes, 0 errors) ณ เวลา 13:32 น.
- Dev server กำลังทำงานอยู่ (`npm run dev`)
- หากมีงานใหม่ ให้เพิ่มลงในส่วน "งานที่รอดำเนินการ" แล้วอัปเดตสถานะเมื่อเริ่มทำ
