# 🧪 คู่มือการทดสอบแบบไม่ต้องเปิดหน้าเว็บจริง (Headless & Backend Testing Guide)

คู่มือนี้อธิบายวิธีทดสอบระบบโดยไม่ต้องพึ่งการเปิดหน้าเว็บให้ผู้ใช้มองเห็น แต่ยังคงตรวจสอบพฤติกรรมของระบบได้ใกล้เคียงการใช้งานจริง ทั้งในระดับ business logic, API, workflow, audit log, และ RLS

---

## 1. คู่มือนี้ใช้เมื่อไร

ใช้คู่มือนี้เมื่อ:
- ต้องการตรวจ logic หลังบ้านเร็วกว่า manual click-through
- ต้องการพิสูจน์ว่า workflow, audit log, หรือสิทธิ์การเข้าถึงทำงานจริง
- ต้องการแยกปัญหาให้ออกว่า bug อยู่ที่ UI, backend, หรือ database policy
- ต้องการทำ regression check ซ้ำได้หลายรอบ

ไม่ควรใช้แทนการทดสอบหน้าเว็บจริงทั้งหมดในกรณี:
- งานที่มีผลกับ layout, responsive, spacing, หรือ visual polish
- งานที่เสี่ยงเรื่อง hydration/client error ที่ต้องเห็นจาก browser จริง
- งานที่ต้องยืนยัน UX end-to-end จากมุมมองผู้ใช้

---

## 2. แนวคิดหลัก

การทดสอบแบบนี้ไม่ได้หมายถึง “ไม่ใช้ browser เลย” แต่หมายถึงเราเลือกใช้เครื่องมือที่เร็วและตรงจุดกว่าการเปิดหน้าให้คนไล่คลิกเอง เช่น:
- เรียก backend logic ตรง
- ยิง request จำลอง
- ใช้ browser automation แบบ headless
- ตรวจฐานข้อมูลหลัง action
- จำลอง session/role สำหรับทดสอบสิทธิ์

เป้าหมายคือให้ตอบคำถามได้ว่า:
- ระบบรับ input นี้แล้วควรทำอะไร
- มีการเขียนข้อมูลจริงหรือไม่
- เขียน log / audit / workflow step ถูกต้องหรือไม่
- role นี้ควรอ่านได้หรือเขียนไม่ได้จริงหรือไม่

---

## 3. เทคนิคการทดสอบหลัก

### 3.1 Direct Backend Call

ใช้เมื่อ:
- ต้องการทดสอบ business logic หรือ helper โดยไม่ผ่าน UI
- ต้องการรู้เร็วว่า logic fail ที่ตัว function หรือ fail ที่หน้าเว็บ

ตัวอย่างงานที่เหมาะ:
- validation
- mapping logic
- audit payload builder
- workflow helper

ข้อดี:
- เร็ว
- แคบและชัด
- เขียน automated test ได้ง่าย

ข้อจำกัด:
- ไม่ครอบคลุม browser state
- ไม่พิสูจน์การเชื่อมต่อหลายชั้นแบบผู้ใช้จริง

---

### 3.2 Request Simulation

ใช้เมื่อ:
- ต้องการทดสอบ API route, action endpoint, หรือการ submit form
- ต้องการจำลอง request/response แบบ browser แต่ไม่เปิดหน้า

ตัวอย่างงานที่เหมาะ:
- `/api/*`
- approval verify/send
- public follow-up endpoints
- auth-related endpoints

สิ่งที่ควรตรวจ:
- status code
- response body
- side effects ใน DB
- error handling

---

### 3.3 Headless Browser Automation

ใช้เมื่อ:
- ต้องการทดสอบ flow ที่ต้อง render page จริง
- ต้องการ click/type/submit เหมือน user แต่ไม่ต้องเปิดหน้าต่างให้เห็น
- ต้องการจับ runtime errors, redirect, DOM state, modal behavior

ตัวอย่างงานที่เหมาะ:
- login flow
- approval modal
- checklist/incident detail flows
- logs viewer tabs

ข้อดี:
- ใกล้เคียง user จริงที่สุดในกลุ่ม non-visual automation
- จับ client/runtime issue ได้

ข้อจำกัด:
- ช้ากว่า direct call
- ต้องมี dev server / auth state

---

### 3.4 Database Verification

ใช้เมื่อ:
- ต้องการพิสูจน์ผลลัพธ์จริงหลัง action
- งานเกี่ยวกับ audit logs, workflow rows, RLS, หรือ data integrity

หลักการ:
- สั่ง action ก่อน
- query DB หลัง action
- เทียบ before/after ให้ชัด

ตัวอย่างงานที่เหมาะ:
- ตรวจว่ามี `system_audit_logs` ถูกสร้าง
- ตรวจว่า `document_approvals` ถูกเปลี่ยน step ถูกต้อง
- ตรวจว่า `auditor` update ไม่สำเร็จจริง
- ตรวจว่า no-op write ให้ผล `0 rows`

---

### 3.5 Session / Role-Based Verification

ใช้เมื่อ:
- ต้องการตรวจ RBAC หรือ RLS
- ต้องการยืนยันพฤติกรรมต่างกันตาม role

ตัวอย่าง role ที่ควรเทียบ:
- `admin`
- `it_staff`
- `approver`
- `employee`
- `auditor`

คำถามที่ต้องตอบ:
- role นี้อ่านอะไรได้
- role นี้เขียนอะไรได้
- UI บล็อกแล้ว DB ยังบล็อกจริงหรือไม่

---

## 4. ลำดับการทดสอบที่แนะนำสำหรับโปรเจกต์นี้

### 4.1 เมื่อตรวจ business logic ปกติ

1. อ่านมาตรฐานที่เกี่ยวข้องใน `docs/standards/`
2. รัน targeted automated tests ก่อน
3. ถ้ายังไม่พอ ให้เรียก backend logic หรือ endpoint ตรง
4. ตรวจ DB ว่าผลลัพธ์ตรงตามที่คาด
5. ค่อยเปิด browser walkthrough ถ้างานมีผลต่อ UX/runtime

### 4.2 เมื่อตรวจ workflow หรือ audit trail

1. เตรียมเอกสารทดสอบ 1 ใบ
2. ทำ action ที่ต้องการตรวจ
3. ตรวจ `system_audit_logs`, `admin_audit_logs`, หรือ legacy logs
4. ตรวจ field-level diff / status transition
5. ตรวจหน้า Logs Viewer อีกชั้นถ้าขอบเขตรวม UI viewer

### 4.3 เมื่อตรวจ RLS / Security

1. เตรียม test account ตาม role
2. ตรวจ read path ก่อน
3. ตรวจ write path แบบ controlled mutation
4. ยืนยันจาก DB ว่าข้อมูลไม่เปลี่ยนจริงเมื่อควรโดนบล็อก
5. ถ้าพบว่า UI บล็อกแต่ DB ยังเขียนได้ ให้ถือว่าไม่ผ่านทันที

---

## 5. Playbook ตามประเภทงาน

### 5.1 Incident / Checklist Edit

สิ่งที่ควรตรวจ:
- save ผ่านหรือไม่
- field สำคัญถูกอัปเดตหรือไม่
- มี structured audit entry หรือไม่
- `field_changes` ตรงกับสิ่งที่แก้จริงหรือไม่

หลักฐานขั้นต่ำ:
- action สำเร็จ
- query หลังบ้านเจอ row ที่เปลี่ยน
- query logs เจอ audit row ที่สัมพันธ์กับเอกสารนั้น

### 5.2 Settings / Master Data

สิ่งที่ควรตรวจ:
- mutation ทำงานผ่าน server path ที่มี audit
- `entity_type`, `entity_id`, `scope` ถูกต้อง
- ถ้าเป็น text-based id ต้องไม่ชน UUID contract

### 5.3 Workflow Approval

สิ่งที่ควรตรวจ:
- step ถูกปลดล็อก/เปลี่ยนสถานะถูกลำดับ
- approver ถูกคน
- log และ audit เขียนครบ
- final approval side effects ทำงานครบ

### 5.4 RLS / Auditor Read-Only

สิ่งที่ควรตรวจ:
- `auditor` อ่าน scope ที่อนุญาตได้
- `auditor` create/update/delete ไม่ได้
- write attempt ต้องไม่เปลี่ยนข้อมูลจริง
- อย่าดูแค่ UI ต้องดู DB policy behavior ด้วย

---

## 6. Checklist ก่อนสรุปว่า “ผ่าน”

- มีหลักฐานจาก source หรือ runtime จริง
- มีหลักฐานจาก DB เมื่อเป็นงานที่มี side effect
- role ที่สำคัญถูกทดสอบครบตาม scope
- log/audit ถูกตรวจเมื่อ feature นั้นควรมี trace
- ถ้าเป็น security/RLS ต้องพิสูจน์ทั้ง read และ write path
- ถ้าเป็น UI-sensitive flow ต้องมี browser verification เพิ่ม

---

## 7. สิ่งที่ห้ามทำ

- ห้ามสรุปว่า “ผ่าน” จาก UI อย่างเดียวในงาน audit หรือ RLS
- ห้ามสรุปว่า “ผ่าน” เพราะ request ไม่ error แต่ยังไม่ได้ตรวจ DB
- ห้ามใช้ browser-only test แทน security verification
- ห้ามใช้ direct function test อย่างเดียวเพื่อยืนยัน end-to-end flow
- ห้ามมองว่า UI read-only เท่ากับ database read-only

---

## 8. Recommendation สำหรับทีม

- ใช้ automated tests สำหรับ logic ซ้ำๆ
- ใช้ headless browser สำหรับ flow ที่มี modal, redirect, หรือ client runtime
- ใช้ DB verification ทุกครั้งเมื่อมี data mutation สำคัญ
- ใช้บัญชีทดสอบแยกตาม role สำหรับ security checks
- เก็บหลักฐานเป็น query result, row diff, และ log references ทุกครั้งในงาน Critical

---

## 9. สรุปสั้น

ถ้าต้องการทดสอบเร็ว:
- เริ่มจาก direct backend call หรือ targeted tests

ถ้าต้องการทดสอบเหมือน user:
- ใช้ headless browser automation

ถ้าต้องการพิสูจน์ว่า “ระบบถูกจริง”:
- ต้องดูผลใน database และ audit logs ร่วมด้วย

สำหรับระบบนี้ แนวทางที่เชื่อถือได้ที่สุดคือ:
- `Action/Request` → `Runtime Result` → `Database Verification` → `Audit/RLS Evidence`
