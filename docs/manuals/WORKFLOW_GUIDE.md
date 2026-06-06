# 📖 คู่มือระบบ Workflow (Unified Workflow Guide)

คู่มือนี้อธิบายขั้นตอนการทำงานของระบบตั้งแต่กระบวนการเข้าใช้งาน การลงทะเบียนยืนยันตัวตน (Login, Gatekeeper, Onboarding) ไปจนถึงกระบวนการอนุมัติเอกสารแบบละเอียด (Incident & Checklist)

---

## 🛡️ 1. ขั้นตอนการทำงานของ Login, Gatekeeper และ Onboarding (Identity & Access Flow)

เพื่อให้ระบบรักษาความปลอดภัยเป็นไปตามมาตรฐานสูงสุดและป้องกันการเข้าถึงข้อมูลโดยไม่ผ่านกระบวนการลงทะเบียน (Loop Prevention) ระบบจึงออกแบบ Flow การยืนยันตัวตนและการตรวจสอบสิทธิ์เข้าใช้งานร่วมกันดังนี้:

### 1.1 การเข้าสู่ระบบแบบรวมศูนย์ (Unified Login & Microsoft SSO)
1. **ทางเลือกการเข้าระบบ:** รองรับทั้งรหัสผ่านธรรมดาและ Microsoft OAuth (SSO) ผ่าน Azure AD
2. **การคัดกรองทะเบียนขาว (Whitelist Check):** ทุกการล็อกอินจะนำ email ไปแปลงเป็น SHA-256 Hash เพื่อนำไปค้นหาในตาราง `user_whitelist`
   - *ไม่ผ่านการทะเบียนขาว (Not Whitelisted):* ระบบจะยกเลิก Session ทันที (Purge session) และส่งไปหน้า `/access-denied`
   - *ผ่านการทะเบียนขาว (Whitelisted):* บันทึก Log ลง `login_logs` และเข้าสู่ขั้นถัดไป

### 1.2 ผู้พิทักษ์ด่านหน้าระดับโกลบอล (Global Gatekeeper - Middleware Proxy Layer)
1. **หน้าที่:** ดักจับทราฟฟิกเฉพาะการเข้าถึงหน้า `/dashboard*`
2. **กลไกการทำงาน:**
   - ตรวจสอบ Cookie `dowa_onboarded`
     - หากเป็น `'true'` จะอนุญาตให้เข้าผ่านโดยไม่ติดโหลดเพิ่ม (NextResponse.next())
     - หากไม่มี Cookie หรือเป็นค่าอื่น จะส่งคำสั่ง Query ไปตรวจสอบในฐานข้อมูล `user_profiles`
       - หาก `is_onboarded === true` -> ตั้งค่า Cookie `dowa_onboarded = 'true'` (อายุ 7 วัน) และให้ผ่าน
       - หาก `is_onboarded === false` -> ส่งการทำงานไปยัง `/api/onboarding/init` เพื่อเริ่มกระบวนการลงทะเบียน

### 1.3 กระบวนการลงทะเบียนใช้งานครั้งแรก (Onboarding Flow)
1. **การสร้าง Token (Self-healing):** 
   - ระบบจะสร้าง `onboarding_token` (UUIDv4) มีอายุ 24 ชั่วโมง บันทึกลงตาราง `user_profiles` แล้วส่งต่อไปที่ `/onboarding?token=...`
2. **ขั้นตอนภายในหน้าจอ Onboarding (`app/onboarding/page.js`):**
   - **Step 1 (Welcome):** แสดงข้อมูลพนักงานและเริ่มการตั้งค่า
   - **Step 2 (Password):** บังคับเปลี่ยนรหัสผ่านตามความซับซ้อนของ IT Audit (มีตัวเล็ก, ตัวใหญ่, ตัวเลข, อักขระพิเศษ, ยาว >= 8)
   - **Step 3 (PIN Setup):** ตั้งค่ารหัสผ่านเซ็นเอกสาร (Signature PIN) 6 หลัก โดยจะทำหน้าที่แปลงเป็น Bcrypt Hash และบันทึกลงฟิลด์ `signature_pin` พร้อมสลับ `is_onboarded = true`, `onboarding_token = null` ในฐานข้อมูล และตั้ง Cookie `dowa_onboarded = 'true'`
   - **Step 4 (Link SSO):** บังคับ/แนะนำการเชื่อมโยงบัญชี Microsoft Account ผ่าน Azure OAuth เพื่อการล็อกอินครั้งถัดไป
   - **Step 5 (Success):** แจ้งเตือนเสร็จสิ้นกระบวนการเพื่อให้เข้าสู่ระบบด้วยข้อมูลใหม่

---

## 📜 [Legacy / Reference Only] ส่วนข้อมูลเดิม (ระบบการอนุมัติและเอกสารสำหรับอ้างอิง)

> [!NOTE]
> ข้อมูลในส่วนด้านล่างนี้เป็นข้อมูลชุดเดิมเกี่ยวกับระบบการอนุมัติและการจัดการเอกสาร (Incident / Checklist) ใช้เพื่อการอ้างอิงของนักพัฒนาและระบบ Workflow หลังบ้านเท่านั้น

### 🏗️ 2. โครงสร้างและตารางที่เกี่ยวข้อง (Architecture)

ระบบ Workflow ของเราถูกออกแบบมาให้เป็นศูนย์กลาง (Unified) โดยใช้ตารางหลักดังนี้:

1.  **`workflow_configs`**: ตารางแม่บทที่กำหนดว่าเอกสารแต่ละประเภท (Incident, Checklist) ต้องผ่านขั้นตอนการอนุมัติอย่างไร
2.  **`approval_configs`**: ตารางกำหนด "ผู้อนุมัติหลัก" (Primary Approver) สำหรับความถี่ of Checklist หรือประเภทงาน
3.  **`document_approvals`**: ตารางที่เก็บสถานะการอนุมัติจริงของเอกสารแต่ละใบ (1 บรรทัด = 1 ขั้นตอน)
4.  **`system_audit_logs`**: เก็บ structured audit trail สำหรับ document/settings changes
5.  **`admin_audit_logs`**: เก็บ user/security actions
6.  **`incident_logs` / `checklist_logs`**: legacy compatibility logs ในรูปแบบ `Action | Details`

### 🔄 3. ขั้นตอนการทำงานของ Incident (ใบแจ้งซ่อม)

กระบวนการของ Incident มีความพิเศษคือมีการ "รวบรวมลายเซ็น" ในขั้นตอนการ Resolve เพื่อลดความซ้ำซ้อน

#### 📌 Flow แผนผังการทำงาน:
1.  **สร้างเคส (Open)**: User แจ้งปัญหา สถานะเริ่มต้นคือ `Open`
2.  **มอบหมายงาน (In Progress)**: เมื่อมีการ Assign ผู้รับผิดชอบ สถานะจะเปลี่ยนเป็น `In Progress` โดยอัตโนมัติ
3.  **การแก้ไขและ Resolve (Resolve Dialog)**:
    *   IT Officer กด Resolve
    *   **ขั้นตอนการเซ็น**:
        1. IT เซ็นชื่อของตนเอง
        2. ผู้แจ้ง (Reporter) ยืนยันตัวตนด้วย PIN และเซ็นชื่อ
        3. (ถ้า Severity = High) ผู้จัดการต้องเซ็นชื่อ
    *   **Logic การบันทึก**: เมื่อกด Submit ระบบจะเรียก `submitRequest()` และ `applySignaturesToWorkflow()` เพื่อนำลายเซ็นที่ได้ไปเติมลงใน Workflow Steps ทันที (Auto-consume)
4.  **ตรวจสอบสถานะ (Status Check)**:
    *   ถ้าเซ็นครบทุกขั้นตอนตาม Config -> สถานะเป็น `Closed` ทันที
    *   ถ้ายังไม่ครบ (เช่น ขาดลายเซ็นผู้จัดการ) -> สถานะเป็น `Pending Approval`
5.  **การปิดเคส (Closed)**: เมื่อขั้นตอนสุดท้ายได้รับการอนุมัติ ระบบจะรัน `onDocumentFinalApproval` เพื่อซิงค์ข้อมูลกลับไปยัง Checklist (ถ้ามี)

#### Audit Expectations ระหว่างแก้เอกสาร
- การแก้ Incident detail ต้องสร้าง canonical `Updated` structured audit entry พร้อม `field_changes`
- การแก้ Checklist detail ต้องสร้าง structured audit entry ทั้งระดับเอกสารและระดับ item ตามจุด mutation สำคัญ

#### ⚖️ เงื่อนไข Yes/No ใน Incident Resolve:
*   **เป็นงานที่มาจาก Checklist?**
    *   `Yes` -> เมื่อเคสถูกปิด ระบบจะไป Update รายการ Checklist นั้นเป็น `OK` อัตโนมัติ
    *   `No` -> ปิดเคสตามปกติ
*   **ระดับความรุนแรง (Severity) คืออะไร?**
    *   `High` -> ระบบจะเพิ่มขั้นตอนการอนุมัติลำดับที่ 3 (Manager) ให้อัตโนมัติ
    *   `Low/Medium` -> มีเพียง 2 ขั้นตอน (IT & Reporter)

### 📋 4. ขั้นตอนการทำงานของ Checklist (การตรวจเช็คประจำวัน)

#### 📌 Flow แผนผังการทำงาน:
1.  **เริ่มการตรวจ (Open)**: เจ้าหน้าที่เริ่มกรอกข้อมูลตาม Template (T1-T5)
2.  **ส่งขออนุมัติ (Submit)**: เมื่อกรอกครบและบันทึก ระบบจะเรียก `submitRequest()`
3.  **สร้างขั้นตอนอนุมัติ**: ระบบดึงข้อมูลจาก `workflow_configs` มาสร้าง Steps ใน `document_approvals`
4.  **ผู้อนุมัติพิจารณา (Approval UI)**:
    *   ผู้อนุมัติเห็นรายการในเมนู "งานรอกดอนุมัติ"
    *   **ทางเลือก (Action)**:
        *   ✅ **อนุมัติ (Approve)**: เซ็นชื่อ -> ปลดล็อคขั้นตอนถัดไป (Waiting -> Pending)
        *   ❌ **ตีกลับ (Reject)**: ใส่เหตุผล -> เอกสารกลับไปสถานะ `Open` (ร่าง) เพื่อให้แก้ไขใหม่
5.  **เสร็จสิ้น (Closed)**: เมื่อคนสุดท้ายเซ็นครบ สถานะจะเป็น `Closed`

#### Audit Expectations ระหว่างลงผลตรวจ
- การเปลี่ยน `evaluation_result`, `evaluation_remark`, `status`, `duration`, `start_time` และ `template_data` ต้องถูกบันทึกเป็น structured audit event
- `template_data` ต้อง log แบบ summary เท่านั้น ห้าม dump payload ดิบทั้งก้อน

### 🔒 5. การยืนยันตัวตน (Authentication Modes)

ระบบรองรับการอนุมัติ 2 รูปแบบ เพื่อความปลอดภัยและความสะดวก:

1.  **Direct Approval (อนุมัติด้วยตัวเอง)**: 
    *   ใช้ในกรณีที่ผู้อนุมัติ Login อยู่ในระบบของตนเอง
    *   สามารถกดอนุมัติได้ทันทีโดยไม่ต้องกรอก PIN (เพราะถือว่า Login แล้ว)
2.  **Remote Approval (อนุมัติผ่านเครื่องคนอื่น)**:
    *   ใช้ในกรณีที่เจ้าหน้าที่มีอุปกรณ์ (Tablet) และเดินไปให้หัวหน้าเซ็นที่โต๊ะ
    *   **ผู้อนุมัติ "ต้อง" กรอก PIN 6 หลัก** เพื่อยืนยันตัวตน
    *   ระบบจะแสตมป์ชื่อเจ้าของ PIN ลงในเอกสารและ Log แม้จะรันจากเครื่องของผู้อื่น

### 📝 6. มาตรฐานการบันทึก Log (Logging Standard)

เพื่อให้ตรวจสอบย้อนกลับได้ง่าย ระบบใช้ 2 ชั้น:
- **Structured audit** ใน `system_audit_logs` / `admin_audit_logs`
- **Legacy display log** แบบ `Action | Details` สำหรับ compatibility

Structured audit ขั้นต่ำต้องมี:
- `metadata.scope`
- `metadata.entity_type`
- `metadata.entity_id`
- `metadata.entity_label`
- `metadata.source_module`
- `metadata.field_changes`

**ตัวอย่าง:**
*   `Submitted | ส่งเอกสารเพื่อขออนุมัติ (ผู้อนุมัติหลัก: นายเอ)`
*   `Approved | อนุมัติโดย: นายบี (b@dowa.co.th) | (Verified by PIN)`
*   `Auto-Update OK | แก้ไขรายการ NG อัตโนมัติจากเคส INC-20240508-001`

#### Logs Viewer Mapping
- `Audit Logs`: document/settings audit จาก `system_audit_logs`
- `Admin Actions`: user/security audit จาก `admin_audit_logs`
- `Backup Logs`: operational records จาก `backup_logs`

### 🛠️ 7. สำหรับผู้ดูแลระบบ (Admin Setup)

Admin สามารถจัดการ Workflow ได้ผ่านเมนู **Master Data > Workflow Settings**:
1.  **Step Order**: กำหนดลำดับ (1, 2, 3...)
2.  **Role Required**: กำหนดว่าใครมีสิทธิ์ในขั้นตอนนี้ (`it_officer`, `manager`, `director`)
3.  **Condition**: กำหนดเงื่อนไขที่ให้ Flow นี้ทำงาน (เช่น ถ้าเป็น `Checklist Daily` ให้ใช้ Flow นี้)

> [!CAUTION]
> การลบ Config ที่กำลังใช้งานอยู่อาจส่งผลให้เอกสารที่ค้างอยู่ใน Workflow ไม่สามารถดำเนินต่อได้ ควรใช้การปิดใช้งาน (`is_active = false`) แทนการลบจริง

---
*เอกสารนี้จัดทำขึ้นและอัปเดตล่าสุดเมื่อวันที่ 06-Jun-2026*
