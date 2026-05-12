# 🛡️ Standard: Dynamic Permission Management

ระบบบริหารจัดการสิทธิ์การเข้าถึง (Role-Based Access Control - RBAC) แบบ Dynamic ของ DOWA IT System ช่วยให้ Admin สามารถปรับเปลี่ยนสิทธิ์ RO/RW ได้ผ่านหน้าจอ Web App โดยไม่ต้องแก้ไข Source Code

## 1. โครงสร้างฐานข้อมูล (Database Schema)

ตาราง: `public.permission_sets`
| Column | Type | Description |
| :--- | :--- | :--- |
| `role_name` | TEXT | ชื่อ Role (administrator, supervisor, approval, member, guest) |
| `feature_key` | TEXT | คีย์ของโมดูล (dashboard, incidents, reports, backup, checklist, settings) |
| `access_level`| TEXT | ระดับสิทธิ์ (RW, RO, NONE) |

## 2. ระดับสิทธิ์ (Access Levels)

- **RW (Read & Write):** เข้าถึงได้สมบูรณ์ (อ่านและเขียนข้อมูล)
- **RO (Read Only):** เข้าถึงได้เพื่อดูข้อมูลเท่านั้น ปุ่มและฟังก์ชันการแก้ไขจะถูกล็อคโดยอัตโนมัติ
- **NONE (No Access):** ไม่เห็นเมนูใน Sidebar และไม่สามารถเข้าถึงหน้าจอได้

## 3. การตรวจสอบสิทธิ์ในโค้ด (Implementation)

การตรวจสอบสิทธิ์จะใช้ฟังก์ชันมาตรฐานใน `lib/auth.js`:

```javascript
import { checkPermission } from '@/lib/auth';

const access = checkPermission(permissions, 'incidents');
if (access === 'RO') {
  // Logic สำหรับโหมดอ่านอย่างเดียว
}
```

## 4. หน้าจอส่วนตัว (Personal Pages)

หน้าจอเหล่านี้เป็นหน้าจอส่วนตัวที่ทุก role สามารถเข้าถึงได้:

| Path | คำอธิบาย | Roles |
|---|---|---|
| `/dashboard/my-pending` | รายการเอกสารที่ตนเองส่งไปและรออนุมัติ | ทุก role |
| `/dashboard/approvals` | รายการเอกสารที่ตนเองต้องอนุมัติ | ทุก role |
| `/dashboard/profile` | โปรไฟล์ส่วนตัว | ทุก role |

> **หมายเหตุ:** หน้าจอเหล่านี้ไม่ต้องเพิ่มใน `permission_sets` เพราะเป็นหน้าจอส่วนตัวที่ไม่ขึ้นกับ role ใด role หนึ่ง

## 5. มาตรฐานความปลอดภัย (Security)
- **Admin Override:** บัญชี `administrator` จะมีสิทธิ์เข้าถึงหน้า Settings เสมอเพื่อป้องกันกรณีระบบ Lockout ตัวเอง
- **Schema Cache:** หากมีการเพิ่ม Feature ใหม่ ต้องทำการอัปเดตข้อมูลลงในตาราง `permission_sets` เพื่อให้ระบบรับทราบ
