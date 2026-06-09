# Release and Rollback Checklist

เอกสารนี้ใช้เป็น checklist สั้นแบบหยิบใช้ซ้ำได้ทุกครั้งก่อนและหลังการ migrate ไป production

---

## 1. Pre-Release Checklist

- [ ] USER เลือก `Production Migration Mode` ชัดเจนแล้ว
- [ ] release scope ถูกล็อกแล้ว
- [ ] source code ต้นทางอยู่ใน `trush000/dowa-it-system`
- [ ] production target คือ `dowa-tht/it-management`
- [ ] development db source คือ `fhcsvvlwhwqzlsltrkuq`
- [ ] production db target คือ `yrgsukhjkoexvdybyyjm`
- [ ] migration files อยู่ใน `supabase/migrations/` ครบ
- [ ] release note หรือ summary พร้อม
- [ ] env/secret checklist พร้อม
- [ ] rollback plan พร้อม

---

## 2. Code Release Checklist

- [ ] commit/tag ที่จะปล่อยถูกระบุชัดเจน
- [ ] trace ได้ว่า production commit มาจาก development source commit ไหน
- [ ] ไม่มี feature ที่ยังไม่ผ่าน review ปะปน
- [ ] ไม่มี dev-only debug code ที่จะหลุดไป production
- [ ] approval flow ยังผ่าน `workflow.js`
- [ ] ไม่พบการใช้ `service_role` ฝั่ง client

---

## 3. Database Migration Checklist

- [ ] migration chain เรียงตาม timestamp ถูกต้อง
- [ ] ไม่มี ad-hoc SQL ที่ไม่มีไฟล์ migration รองรับ
- [ ] schema changes ได้ทดสอบบน dev db แล้ว
- [ ] RLS และ policy ถูกตรวจแล้ว
- [ ] RBAC contract ไม่เปลี่ยนโดยไม่ตั้งใจ
- [ ] setup/master data ที่จะย้ายถูกระบุชัด
- [ ] transaction data ไม่อยู่ใน scope เว้นแต่ USER อนุมัติพิเศษ

---

## 4. Environment Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `RESEND_API_KEY` ถ้า release นี้กระทบ email flow
- [ ] OneDrive / MS Graph secrets ถ้า release นี้กระทบ upload/file flow

---

## 5. Post-Release Smoke Test

- [ ] login ใช้งานได้
- [ ] dashboard โหลดได้
- [ ] incident page โหลดได้
- [ ] checklist page โหลดได้
- [ ] approvals view โหลดได้
- [ ] reports / SLA page โหลดได้
- [ ] setup pages ที่เกี่ยวข้องโหลดได้
- [ ] ไม่มี critical console/server error

---

## 6. Rollback Triggers

ให้เตรียม rollback ทันทีถ้าเจอ:
- schema mismatch ระดับ critical
- login ใช้งานไม่ได้
- approval flow พัง
- RLS policy หลุดจนเกิด security risk
- incident/checklist core flow ใช้งานไม่ได้

---

## 7. Rollback Checklist

- [ ] หยุด release window
- [ ] ระบุ root cause คร่าวๆ
- [ ] revert code ไปยัง release tag ก่อนหน้า
- [ ] rollback schema ตามแผนที่เตรียมไว้
- [ ] restore data/snapshot ถ้าจำเป็น
- [ ] ทดสอบ smoke test หลัง rollback
- [ ] บันทึก incident และ remediation plan

---

## 8. Evidence to Keep

- release tag
- commit SHA
- migration file list
- backup/snapshot reference
- verification result
- rollback result ถ้ามี

---

## 9. Related Documents

- `docs/manuals/PRODUCTION_MIGRATION_SOP.md`
- `docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`
- `docs/standards/DEV_PROD_OPERATING_POLICY.md`
- `docs/standards/MIGRATION_COMMAND_CONTRACT.md`
