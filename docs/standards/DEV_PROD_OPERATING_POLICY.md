# Development and Production Operating Policy

เอกสารนี้กำหนดกติกาการทำงานประจำวันระหว่าง development source / environment และ production release repo / environment สำหรับ DOWA IT System

---

## 1. Canonical Environment Map

| Area | Purpose | Repository / Project | Identifier |
|---|---|---|---|
| Development Code | พัฒนาและทดสอบทุกงานก่อนปล่อยจริง | `trush000/dowa-it-system` | Git remote `origin` |
| Production Code | รับเฉพาะ release ที่พร้อมใช้งานจริง | `dowa-tht/it-management` | Git remote `upstream` |
| Development Database | ทดสอบ schema, workflow, seed, feature | Supabase | `fhcsvvlwhwqzlsltrkuq` |
| Production Database | ใช้งานจริง | Supabase | `yrgsukhjkoexvdybyyjm` |

---

## 2. Default Operating Mode

- ค่าเริ่มต้นทุก session คือ `Development Mode`
- หาก USER ไม่ได้ระบุเป็นอย่างอื่น ให้ AI ทำงานเฉพาะฝั่ง development เท่านั้น
- การพูดถึง `migration`, `production`, `deploy`, `promote` ต้องเข้าสู่ `Migration Mode Router` ก่อนทุกครั้ง

---

## 3. Repository Contract

### Development Source
- Repo: `https://github.com/trush000/dowa-it-system`
- Local workspace หลัก: `C:\Users\Lenovo\dowa-it-system`
- ใช้สำหรับ:
  - feature development
  - bug fix
  - refactor
  - test automation
  - migration file authoring
  - dev seed / verification scripts

### Production Release Repo
- Repo: `https://github.com/dowa-tht/it-management`
- ใช้สำหรับ:
  - รับ release ที่ผ่านการตรวจแล้ว
  - trace release commit/tag สำหรับ production
  - sync code ที่พร้อม production only

### Hard Rules
- ห้ามพัฒนา feature ใหม่บน production release repo
- ห้าม push ไป production repo โดยอัตโนมัติ
- hotfix ที่ production ต้อง backport กลับ development source ทันที

---

## 4. Database Contract

### Development Database
- Project: `fhcsvvlwhwqzlsltrkuq`
- ใช้สำหรับ:
  - apply migration ใหม่
  - test RLS / RBAC / workflow
  - verify seed/master data
  - test scripts ใน `scripts/`

### Production Database
- Project: `yrgsukhjkoexvdybyyjm`
- ใช้สำหรับ:
  - apply approved migration files เท่านั้น
  - apply approved setup/master data เท่านั้น

### Hard Rules
- ห้ามแก้ production schema แบบ ad-hoc
- ทุก schema change ต้องมีไฟล์ใน `supabase/migrations/`
- ห้ามย้าย transaction data จาก dev ไป prod โดยอัตโนมัติ

---

## 5. Path Responsibilities

| Path | Responsibility |
|---|---|
| `app/` | หน้า UI, routes, API routes, server actions |
| `app/actions/` | business logic ฝั่ง server |
| `lib/` | shared workflow, auth, audit, Supabase helpers |
| `supabase/migrations/` | source of truth สำหรับ schema / RLS / policy / function changes |
| `scripts/` | helper scripts สำหรับตรวจสอบ, seed, repair, migration support |
| `tests/` | regression / verification tests |
| `docs/standards/` | policy และ rule ถาวร |
| `docs/manuals/` | how-to, SOP, playbook |
| `docs/history/` | changelog, audit, implementation history |

---

## 6. Allowed Actions by Mode

### Development Mode
- แก้โค้ด
- เพิ่ม/แก้ migration files
- รัน `npm test`
- รัน `npm run build`
- ใช้งาน dev database
- เขียน release notes draft

### Migration Planning Mode
- สรุป code diff
- สรุป migration file list
- สรุป env/secret checklist
- เตรียม rollback plan
- เตรียม post-release verification plan

### Production Migration Mode
- sync code ไป production repo
- apply approved migrations ไป production database
- apply approved setup/master data
- ทำ smoke test
- สรุป release outcome

---

## 7. Required Release Artifacts

ก่อนเข้า `Production Migration Mode` ต้องมีอย่างน้อย:
- release scope
- list ของ commit / PR / tag
- migration file list จาก `supabase/migrations/`
- setup/master data list ถ้ามี
- env / secret checklist
- rollback plan
- post-migration verification checklist

---

## 8. Anti-Drift Rules

- หาก production repo มี hotfix ต้อง sync กลับ development source
- หาก production DB ถูกแก้ฉุกเฉิน ต้องสร้าง migration ตามย้อนหลังทันที
- หากมี seed/setup data ใหม่ ต้องระบุว่าเป็น `dev-only` หรือ `prod-approved`

---

## 9. Related Documents

- `docs/standards/MIGRATION_COMMAND_CONTRACT.md`
- `docs/manuals/PRODUCTION_MIGRATION_SOP.md`
- `docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md`
- `docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`
