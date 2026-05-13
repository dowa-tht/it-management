# 🔍 Audit System Gap Analysis (13-May-2026)

เอกสารฉบับนี้สรุปผลการตรวจสอบความสอดคล้อง (Audit) ระหว่าง **มาตรฐาน (Standards)** และ **โค้ดจริง (Source Code)** ของระบบ DOWA IT System

---

## 🟢 1. สอดคล้องตามมาตรฐาน (Compliant)

| หัวข้อ | สถานะ | หลักฐาน (Evidence) |
| :--- | :---: | :--- |
| **Transactional Workflow** | ✅ | RPC `handle_approval_step` ใน `supabase/migrations/` ทำงานแบบ Transaction ครบถ้วน |
| **Remote Approval Audit** | ✅ | `verified_by_pin` ถูกบันทึกเมื่อ `p_is_remote = true` ตามมาตรฐาน Workflow §13 |
| **Reporter Identity** | ✅ | `reported_by_id` (UUID) มีในตาราง `incidents` และถูกใช้งานใน `workflow.js` |
| **Centralized Logging** | ✅ | `system_audit_logs` เป็น Source of Truth หลักสำหรับการตรวจสอบประวัติ |
| **RBAC Enforcement** | ✅ | มีการตรวจ Role ในระดับ Server Actions ก่อนทำ Transaction สำคัญ |

---

## 🟡 2. จุดที่ไม่สอดคล้องหรือควรปรับปรุง (Gaps & Inconsistencies)

### **Gap 2.1: การค้นหา My Incidents บน Dashboard**
- **มาตรฐาน (§11.3)**: ห้ามใช้ `full_name` ในการค้นหา — ต้องใช้ UUID หรือ Email เท่านั้น
- **สิ่งที่พบ**: ใน `app/actions/dashboard.js:L99-101` ยังมีการใช้ `profileName` และ `profileEmail` ค้นหาแบบ String Match (ilike/includes) เป็น Fallback
- **ข้อเสนอแนะ**: ควรปรับให้ใช้ `reported_by_id === userProfile.id` เพียงอย่างเดียวเพื่อความแม่นยำ 100% ตามมาตรฐาน Zero Hack

### **Gap 2.2: การเก็บ Migration Scripts**
- **มาตรฐาน**: ไฟล์ Database Schema ควรอยู่ใน `supabase/migrations/`
- **สิ่งที่พบ**: พบไฟล์ `scripts/migration_reported_by_id.sql` อยู่แยกต่างหาก ทำให้การทำ Environment Sync อาจตกหล่น
- **ข้อเสนอแนะ**: ควรย้าย Migration ทั้งหมดไปไว้ใน `supabase/migrations/` เพื่อให้ระบบ CI/CD หรือ Agent อื่นเห็นลำดับการทำงานที่ชัดเจน

### **Gap 2.3: ความซ้ำซ้อนของ Logging ใน Workflow**
- **สิ่งที่พบ**: ใน `workflow.js` มีทั้ง `recordLog` (Wrapper) และ `recordAuditLog` (Implementation) และยังมีการบันทึก Legacy Logs (`incident_logs`) ใน `recordAuditLog`
- **ข้อเสนอแนะ**: เมื่อระบบ Centralized Logging เสถียรแล้ว ควรมีแผนการ Deprecate Legacy Logs อย่างชัดเจนเพื่อลด DB Storage และความซับซ้อน

---

## 🔴 3. ข้อผิดพลาดที่ต้องแก้ไขทันที (Critical Issues)
- **ไม่พบข้อผิดพลาดระดับวิกฤต** ในการตรวจสอบครั้งนี้ (System Integrity is High)

---

## 🛠️ 4. แผนการดำเนินงานถัดไป (Action Plan)
1.  **Refactor Dashboard Lookup**: ปรับ `getDashboardData` ให้ใช้ UUID-only สำหรับการ Filter งานส่วนตัว
2.  **Migration Cleanup**: ย้าย SQL Scripts จาก `/scripts` เข้าสู่ `/supabase/migrations`
3.  **Standard Sync**: อัปเดต `SYSTEM_ARCHITECTURE_MAP.md` ให้ระบุถึงการ Deprecation ของ Legacy Logs

---
> [!NOTE]
> การตรวจสอบนี้ดำเนินการโดย Antigravity Agent เมื่อวันที่ 13 พฤษภาคม 2569 เวลา 06:40 น.
