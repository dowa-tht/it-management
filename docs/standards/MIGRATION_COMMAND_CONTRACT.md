# Migration Command Contract

เอกสารนี้กำหนดคำสั่งมาตรฐานที่ USER ใช้สื่อสารกับ AI เพื่อลดความกำกวมระหว่างงานพัฒนาและงาน migration ไป production

---

## 1. Default Interpretation

- ถ้า USER ไม่ได้พูดคำว่า `migration`, `production`, `deploy`, `promote` ให้ถือว่าเป็น `Development Mode`
- ถ้า USER พูดคำที่เกี่ยวกับ migration ให้ AI หยุดก่อนและแสดง `3 โหมด` เสมอ
- ถ้า USER ยังไม่เลือกโหมด ห้ามแตะ production

---

## 2. Three Modes

### 1) Development Mode
- ความหมาย: พัฒนาและทดสอบบน dev เท่านั้น
- Code target: `trush000/dowa-it-system`
- DB target: `fhcsvvlwhwqzlsltrkuq`

### 2) Migration Planning Mode
- ความหมาย: เตรียมแผน migration แต่ยังไม่ย้ายจริง
- Code target: dev repo only
- DB target: dev db only
- Output: plan, checklist, diff summary, rollback plan

### 3) Production Migration Mode
- ความหมาย: อนุญาตให้ migrate ไป production จริง
- Code target: `dowa-tht/it-management`
- DB target: `yrgsukhjkoexvdybyyjm`

---

## 3. Recommended User Phrases

### Development Commands
- `พัฒนาบน development: ...`
- `แก้บน dev เท่านั้น: ...`
- `ทดสอบบน development: ...`

### Migration Planning Commands
- `ช่วยเตรียม migration plan`
- `prepare migration summary`
- `ตรวจ production readiness`

### Production Execution Commands
- `migrate to production`
- `ย้ายขึ้น production`
- `promote release นี้ไป production`

---

## 4. AI Response Contract

เมื่อเห็นคำว่า migration หรือ production AI ต้องตอบในลักษณะนี้ก่อน:

```text
> [!IMPORTANT]
ตรวจพบคำสั่งที่เกี่ยวกับ Migration / Production

ระบบมี 3 โหมด:
1) Development Mode — พัฒนาและทดสอบบน dev เท่านั้น
2) Migration Planning Mode — เตรียมแผน migration แต่ยังไม่แตะ production
3) Production Migration Mode — ย้าย code / migration ไป production จริง

ค่าเริ่มต้นตอนนี้คือ: Development Mode
ตอนนี้ AI จะยังไม่ทำอะไรกับ production จนกว่าคุณจะเลือกโหมด

ตอบกลับเป็นเลขข้อ:
1 = กลับไปทำงานแบบ Development Mode
2 = ให้เตรียมแผน Migration ก่อน
3 = ยืนยันเข้าสู่ Production Migration Mode
```

---

## 5. Scope Matrix

| Command Type | Dev Repo | Dev DB | Prod Repo | Prod DB |
|---|---|---|---|---|
| Development Mode | Allowed | Allowed | Blocked | Blocked |
| Migration Planning Mode | Read/Plan only | Read/Plan only | Blocked | Blocked |
| Production Migration Mode | Source only | Source verification only | Allowed | Allowed |

---

## 6. Unsafe Ambiguity Examples

คำสั่งต่อไปนี้ยังไม่ถือว่าเป็น permission ให้แตะ production:
- `migration หน่อย`
- `ช่วยย้ายระบบ`
- `deploy ได้เลยไหม`
- `เอาขึ้นของจริง`
- `push production`

AI ต้องให้ USER เลือกโหมดก่อนทุกครั้ง

---

## 7. Required Confirmation Before Production Migration

ก่อน execute `Production Migration Mode` ต้องยืนยันอย่างน้อย:
- release scope
- migration file list
- setup/master data scope
- rollback plan
- verification plan

---

## 8. Related Documents

- `docs/standards/DEV_PROD_OPERATING_POLICY.md`
- `docs/manuals/PRODUCTION_MIGRATION_SOP.md`
- `docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md`
