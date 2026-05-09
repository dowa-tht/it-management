# 🛠️ แผนการ Refactor: ระบบสิทธิ์และชื่อ Role (Global Cleanup Checklist)

เอกสารนี้รวบรวมจุดที่ตรวจพบว่ายังใช้ชื่อ Role เก่า (Legacy) ซึ่งต้องทำการแก้ไขให้เป็นมาตรฐานใหม่ทั้งหมด

---

## 📍 จุดที่ต้องแก้ไขโดยละเอียด (Evidence-Based Cleanup)

### 1. ระบบยืนยันตัวตน (Core Auth & Security)
ต้องเปลี่ยนชื่อ Role ใน Array ที่ใช้เช็คสิทธิ์การเข้าถึง:
- [x] **`app/actions/status.js`**: (L43, L45) เปลี่ยน `administrator` -> `admin`, `supervisor` -> `it_staff`, `approval` -> `approver`
- [x] **`app/api/auth/check-tier/route.js`**: (L43, L45) เปลี่ยนชื่อ Role ทั้งหมดให้ตรงตามมาตรฐานใหม่
- [x] **`app/actions/recovery.js`**: (L47) เปลี่ยน `approval` -> `approver`, `guest` -> `auditor`
- [x] **`app/actions/workflow.js`**: (L868, L964) เปลี่ยน `administrator` -> `admin`

### 2. ระบบจัดการผู้ใช้ (User Management API)
ลบ Logic ที่เป็นลูกผสม (Hybrid) ออก ให้เหลือเพียงชื่อใหม่เท่านั้น:
- [x] **`app/api/users/create/route.js`**: (L45-49) ลบเงื่อนไขที่เช็ค `supervisor`, `member`, `user`, `visitor` ออก ให้เหลือเฉพาะค่ามาตรฐานใหม่
- [x] **`app/api/users/migrate-tier/route.js`**: (L29, L59, L113) ปรับปรุงชื่อ Role ในกระบวนการย้าย Tier
- [x] **`app/actions/users.js`**: (L29) เปลี่ยนค่า Default ของ `quickAddUser` จาก `member` -> `employee`
- [x] **`app/actions/admin.js`**: (L23-27) ลบ Logic ส่วนเกินที่เช็ค Role เก่าทิ้ง

### 3. หน้าจอการใช้งาน (Frontend UI)
ปรับปรุงเงื่อนไขการแสดงผล (Conditional Rendering):
- [x] **`app/dashboard/page.js`**: (L296, L298) เปลี่ยน `member` -> `employee`
- [x] **`app/dashboard/reports/sla/page.js`**: (L182) เปลี่ยน `administrator` -> `admin`
- [x] **`app/dashboard/checklist/[id]/page.js`**: (L651, L723) เปลี่ยน `administrator` -> `admin`
- [x] **`app/dashboard/settings/substitutes/page.js`**: (L36) เปลี่ยนชื่อ Role ในตัวกรองข้อมูล
- [x] **`app/dashboard/settings/approvals/page.js`**: (L23, L45) เปลี่ยนชื่อ Role ในตัวกรองข้อมูล

---

## 🗄️ SQL Migration (Final Data Cleanup)
รันคำสั่งนี้เพื่อให้มั่นใจว่าข้อมูลใน Database ถูกต้อง 100%:

```sql
-- Normalizing User Roles
UPDATE public.user_profiles SET role = 'admin'    WHERE role IN ('administrator', 'superuser');
UPDATE public.user_profiles SET role = 'it_staff' WHERE role IN ('supervisor', 'it_member');
UPDATE public.user_profiles SET role = 'employee' WHERE role IN ('member', 'user');
UPDATE public.user_profiles SET role = 'auditor'  WHERE role IN ('guest', 'visitor');
UPDATE public.user_profiles SET role = 'approver' WHERE role = 'approval';

-- Normalizing Workflow Configs
UPDATE public.document_approvals SET role_required = 'it_staff' WHERE role_required = 'supervisor';
UPDATE public.document_approvals SET role_required = 'approver' WHERE role_required = 'approval';
UPDATE public.document_approvals SET role_required = 'admin'    WHERE role_required = 'administrator';
```

---

## ✅ มาตรฐานการตรวจสอบ (Verification)
- [x] ค้นหาคำว่า `'guest'`, `'supervisor'`, `'member'`, `'administrator'` ทั่วทั้งโปรเจกต์ต้อง **ไม่พบผลลัพธ์**
- [x] ทดสอบ Login ด้วย Account ทุกประเภท และตรวจสอบว่า Badge แสดงชื่อใหม่ถูกต้อง
- [x] ตรวจสอบว่า `auditor` ไม่สามารถกดปุ่มแก้ไขในหน้า Checklist และ Incident ได้

---
*บันทึกโดย: Project Checker*
*วันที่: 08-May-2026*
