# Production Migration SOP

SOP นี้อธิบายขั้นตอนทีละลำดับสำหรับการย้าย release จาก development ไป production ของ DOWA IT System

---

## 1. Environment and Repo Targets

### Development Source
- Repo: `trush000/dowa-it-system`
- Local path: `C:\Users\Lenovo\dowa-it-system`
- Supabase dev: `fhcsvvlwhwqzlsltrkuq`

### Production Target
- Repo: `dowa-tht/it-management`
- Supabase prod: `yrgsukhjkoexvdybyyjm`

---

## 2. Entry Condition

SOP นี้ใช้ได้เมื่อ USER เลือก `Production Migration Mode` แล้วเท่านั้น

หากยังไม่ได้เลือกโหมด ให้ย้อนกลับไปใช้:
- `docs/standards/MIGRATION_COMMAND_CONTRACT.md`

---

## 3. Required Inputs Before Migration

ต้องมีรายการต่อไปนี้ก่อนเริ่ม:
- release name หรือ tag
- ขอบเขตโค้ดที่จะย้าย
- migration files ที่จะใช้
- รายการ setup/master data ที่จะย้าย
- รายการ env/secrets ที่เกี่ยวข้อง
- rollback plan
- verification checklist หลังย้าย

---

## 4. Step-by-Step Procedure

### Step 1: Freeze Release Scope
- ล็อกว่า release นี้จะย้ายอะไรบ้าง
- ห้ามเพิ่ม feature ใหม่ระหว่าง migration window
- บันทึก commit/tag ของ development source ที่จะใช้เป็นต้นทาง

### Step 2: Verify Development State
- ยืนยันว่าโค้ดต้นทางอยู่ใน development source
- ยืนยันว่า migration files อยู่ใน `supabase/migrations/`
- ยืนยันว่าการทดสอบที่เกี่ยวข้องผ่านแล้ว
- อย่างน้อยต้องพิจารณา:
  - `npm test`
  - `npm run build`

### Step 3: Prepare Migration Inventory
- สรุปไฟล์โค้ดที่เปลี่ยน
- สรุปไฟล์ migration ใหม่
- สรุป script หรือ seed ที่จำเป็น
- แยกว่าอะไรคือ:
  - code
  - schema
  - setup/master data
  - non-production-only artifacts

### Step 4: Backup and Checkpoint
- สร้าง backup หรือ snapshot ตามเครื่องมือที่ใช้งานอยู่
- บันทึก checkpoint ของ:
  - release tag
  - migration file list
  - production schema state
  - critical row counts สำหรับ master/setup data

### Step 5: Sync Code to Production Repo
- นำ release ที่อนุมัติแล้วไปยัง `dowa-tht/it-management`
- ยืนยันว่า commit ที่ production trace กลับมาที่ development source ได้
- บันทึก mapping ระหว่าง:
  - release tag
  - commit SHA
  - migration file list

### Step 6: Apply Database Migrations
- apply เฉพาะไฟล์ที่อยู่ใน `supabase/migrations/`
- apply ตามลำดับ timestamp เท่านั้น
- ห้ามรัน ad-hoc SQL ที่ไม่มีไฟล์รองรับ

### Step 7: Apply Approved Setup or Master Data
- apply เฉพาะข้อมูลที่ระบบจำเป็นต้องมี
- ตัวอย่าง:
  - holiday setup
  - workflow config
  - permission/setup data
- ห้ามย้าย transaction data จาก dev โดยอัตโนมัติ

### Step 8: Post-Migration Verification
- ตรวจอย่างน้อย:
  - login
  - dashboard load
  - incident basic flow
  - checklist basic flow
  - approval view
  - reports / SLA page load
  - RLS / policy sanity check

### Step 9: Release Decision
- ถ้าทุกอย่างผ่าน ให้ปิด release เป็น success
- ถ้าพบ critical issue ให้หยุดและใช้ rollback plan

---

## 5. File and Path Checklist

| Path | ต้องตรวจอะไร |
|---|---|
| `app/` | routes/pages/actions ที่เปลี่ยน |
| `components/` | UI component ที่ release นี้ใช้ |
| `lib/` | workflow, auth, audit, Supabase helpers |
| `supabase/migrations/` | migration chain ใหม่ทั้งหมด |
| `scripts/` | seed/verification/helper scripts |
| `tests/` | regression tests ที่เกี่ยวข้อง |
| `docs/history/CHANGELOG.md` | release note / change log |

---

## 6. Non-Negotiable Rules

- ห้ามใช้ production เป็นที่ทดลอง
- ห้ามย้ายของจริงโดยไม่มี rollback plan
- ห้าม apply production schema change ถ้าไม่มี migration file
- ห้ามย้าย transaction data จาก dev ไป prod โดยไม่ได้รับอนุมัติเป็นกรณีพิเศษ

---

## 7. Related Documents

- `docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`
- `docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md`
- `docs/standards/DEV_PROD_OPERATING_POLICY.md`
- `docs/standards/MIGRATION_COMMAND_CONTRACT.md`
