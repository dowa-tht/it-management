# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 6 มิถุนายน 2569 (06-Jun-2026)

- **[16:58] Close Manual Verification And Fix Auditor RLS Leak**
  - **ปิด manual verification เพิ่มเติมสำหรับ audit rollout:**
    - ยืนยันว่า `Checklist` edit เขียน structured audit entry ได้จริงจากเอกสารทดสอบ `CHK-AUDIT-20260606-162832`
    - สร้างบัญชีทดสอบ `test_auditor@dowa.local` เพื่อยืนยันพฤติกรรม read-only ของบทบาท `auditor`
  - **พบและยืนยัน root cause ด้านความปลอดภัยจาก live database:**
    - `incidents` ยังมี permissive policy `Allow all for authenticated users`
    - `checklist_items` ยังมี write policy ที่อิง `current_user_can_access_checklist_doc(doc_id)` ทำให้ auditor ที่อ่านได้สามารถเขียนได้ด้วย
  - **เพิ่ม migration สำหรับปิดช่องโหว่ RLS:**
    - สร้าง `supabase/migrations/20260606_fix_auditor_readonly_rls_leaks.sql`
    - แยก checklist read/write access ให้ `auditor` อ่านได้แต่เขียนไม่ได้
    - แทน broad incident write policy ด้วย select/update policy ที่จำกัดตาม role และ ownership จริง
  - **ยืนยันหลัง apply migration:**
    - `auditor` ยังอ่าน `checklist`, `incident`, `backup_logs` ได้
    - `auditor` update `checklist_items` และ `incidents` ไม่สำเร็จแล้ว (`0 rows`)
    - ตรวจสอบซ้ำจากฐานข้อมูลแล้วว่าข้อมูลจริงไม่ถูกแก้
  - **สถานะรอบนี้:**
    - functional verification หลักของ `IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER` ครบแล้ว
    - เหลือเฉพาะ local close-out commit จาก working tree ปัจจุบัน
- **[16:22] Continue Authenticated Audit Verification And Fix Runtime Gaps**
  - **ยืนยันผลจาก runtime + database evidence เพิ่มเติมสำหรับงาน audit rollout:**
    - ตรวจสอบว่า `Admin Actions` และ `Backup Logs` เปิดใช้งานได้จากหน้า `System Logs & Audit`
    - ยืนยันว่า `Incident` detail edit เขียน structured audit entry ลง `system_audit_logs` ได้จริง
    - ยืนยันว่า `Working Hours` settings change เขียน structured audit entry พร้อม `field_changes` และ `user_email` ที่ถูกต้อง
  - **แก้ runtime bug ระหว่าง manual verification:**
    - แก้หน้า `app/dashboard/settings/logs/page.js` ไม่ให้ render object ใน `details` จน React crash เมื่อเปิด `Admin Actions`
    - เปลี่ยนการอ่าน `logs_guide_content` เป็น `.maybeSingle()` เพื่อลด 406/no-row noise ใน runtime
  - **แก้ audit payload bug สำหรับ settings entities ที่ใช้ id แบบ text:**
    - ปรับ `lib/audit.js` ให้ `doc_id` ใช้ zero UUID เมื่อ `entityId` ไม่ใช่ UUID
    - ปรับ `app/actions/audit.js` ให้ `recordEntityAuditLog()` รองรับ normalized payload และให้ `recordClientAuditLog()` เก็บ `userEmail` fallback ได้ถูกต้อง
  - **ยืนยันหลังแก้ไข:**
    - `npm test` ผ่าน `34/34`
    - `npm run build` ผ่าน
  - **สถานะที่ยังค้างสำหรับ manual verification ปิดรอบ:**
    - checklist live edit walkthrough
    - auditor read-only walkthrough

- **[15:26] Shrink Changelog And Continue Audit Plan Close-Out**
  - **ย้ายบันทึกของวันที่ 05-Jun-2026 ไป archive ตามกฎ daily log shrinking:**
    - สร้าง `docs/history/archive/CHANGELOG_2026_06_05.md`
    - ย่อ `docs/history/CHANGELOG.md` ให้เหลือเฉพาะ section ของวันที่ปัจจุบัน
  - **ทบทวนสถานะ implementation plan รอบ audit อีกครั้งจากไฟล์จริง:**
    - ยืนยันว่า `Task 1-6` ทำเสร็จแล้วจาก implementation/test/build เดิม
    - ยืนยันว่าจุดค้างหลักเหลือ `Task 7 Step 4` และ final close-out commit
  - **ความพยายามในการ manual verification รอบนี้:**
    - เรียก `next dev` และตรวจ runtime/brower tooling เพื่อเตรียมปิด manual verification
    - ยังไม่สามารถคง dev server สำหรับ browser walkthrough แบบ authenticated ได้จาก session ปัจจุบัน จึงต้องเก็บ checklist นี้ไว้เป็นงาน verify เชิง runtime ต่อ
  - **จัดระเบียบ local commit ของงานที่เสร็จแล้ว:**
    - รวม `Tasks 2-6` ไว้ใน commit `d5a1b3c` (`feat: complete audit trail rollout`)
    - ยังไม่ได้ push ขึ้น GitHub ตามขอบเขตงานปัจจุบัน

---

## 📦 บันทึกย้อนหลัง (Archives)

### มิถุนายน 2569 (June 2026)
- [CHANGELOG_2026_06_05.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_05.md)
- [CHANGELOG_2026_06_04.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_04.md)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_29.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_29.md)
- [CHANGELOG_2026_05_28.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_28.md)
- [CHANGELOG_2026_05_27.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_27.md)
- [CHANGELOG_2026_05_26.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_26.md)
- [CHANGELOG_2026_05_25.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_25.md)
- [CHANGELOG_2026_05_21.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_21.md)
- [CHANGELOG_2026_05_20.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_20.md)
- [CHANGELOG_2026_05_19.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_19.md)
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
*อัปเดตล่าสุด: 06-Jun-2026 16:58*
