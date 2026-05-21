# 📋 รายละเอียดความต้องการระบบ Target Registry & QR Asset History (Overhaul Requirements)

เอกสารนี้ระบุรายละเอียดความต้องการทั้งหมด (Requirements Specification) สำหรับฟีเจอร์การตรวจงานแยกอุปกรณ์ (Target Registry), การตั้งค่าสิทธิ์ Behavior รายตัว, หน้าจอแสดงประวัติสาธารณะจากการสแกน QR Code (Public QR Landing Page) แบบปฏิทิน และการควบคุมความปลอดภัยผ่าน Session 30 นาที

---

## 🔍 1. รายละเอียดความต้องการระบบ (Detailed Requirements)

### 1.1 Target Registry & Asset Mapping (ระบบลงทะเบียนอุปกรณ์และผูกฟอร์มตรวจ)
- ระบบต้องรองรับการจัดการอุปกรณ์แบบกลุ่ม (Target Group) และแบบระบุตัวตนรายอุปกรณ์ (Target) 
- ข้อมูลชนิดของอุปกรณ์ (Target Type) ต้องเลือกจาก Dropdown มาตรฐานที่กำหนดไว้ใน Master Data (เช่น ตู้ CCTV Terminal, แอร์ห้องเซิร์ฟเวอร์ `AC-SRV-001`, เครื่องสำรองไฟ UPS, อุปกรณ์เครือข่าย Switch)
- ระบบต้องรองรับการกำหนดขอบเขตของ Checklist Template ด้วยสถานะ `scope_mode` ได้แก่:
  - `global`: ใช้กับทุกเครื่องเหมือนกันหมด
  - `per_target`: ผูกกับอุปกรณ์เจาะจงรายตัว
  - `per_group`: ผูกกับกลุ่มอุปกรณ์ (ตรวจเช็คหลายชิ้นงานในใบงานเดียว เช่น ตรวจตู้ CCTV ทั้ง 5 จุดในใบตรวจใบเดียว)

### 1.2 Setup Template Builder & Behavior Customization (หน้าจอผู้พัฒนาและตัวสลับพฤติกรรม)
- ในหน้าจอการสร้างและแก้ไข Template (`Settings > Checklist Template Builder`) จะต้องเพิ่ม UI ด้านขวาหรือด้านล่างสำหรับการระบุ **Scope Mode**, **Target Type** และตัวเลือกของอุปกรณ์/กลุ่มอุปกรณ์ที่เทมเพลตนี้จะทำงานด้วย
- เพิ่มตัวเลือกสวิตช์ใน UI: **"ปรับให้ทุก Target ใช้ Behavior เดียวกันหมด" (Uniform Behavior - Default)** เทียบกับ **"ตั้งค่าแยก Behavior ราย Target" (Separate Behavior for each target)**
- หากเปิดสวิตช์ตั้งค่าแยก Behavior:
  - UI จะต้องแสดงรายการอุปกรณ์ทั้งหมดภายใต้ความสัมพันธ์การผูก (Mapping) นั้นๆ
  - แต่ละรายการอุปกรณ์ต้องมีฟิลด์ให้เลือกชนิด Behavior (`ui_template_type` T0-T5) และระบุคอนฟิกย่อย (`template_config`) เฉพาะของตู้ใบนั้นแยกกันได้อย่างอิสระ
  - ข้อมูล Behavior ปรับแต่งเฉพาะตัวนี้จะจัดเก็บลงในคอลัมน์ `override_config` รูปแบบ JSONB ในตารางเชื่อมโยง `checklist_template_targets`

### 1.3 Public QR Resolver Page (หน้าสำหรับสแกนและสลับสิทธิ์การเข้าถึง)
- ทางเข้าผ่านลิงก์สาธารณะโดยไม่ต้อง Login เช่น `/public/checklist/qr?value=[QR_VALUE]`
- หน้าจอนี้จะรับค่า `qr_value` ของอุปกรณ์ แล้วเข้าสู่กระบวนการค้นหาตัวตน (Lookup) ของอุปกรณ์ชิ้นดังกล่าวในฐานข้อมูล
- หากพบอุปกรณ์ จะต้องทำการเริ่ม **Public Scan Session** โดยส่ง Secure Session Cookie กลับไปบันทึกที่หน้าบราวเซอร์ของผู้ใช้งาน
- หากไม่พบข้อมูลอ้างอิงจาก QR ให้แสดงหน้า Error และปุ่มสำหรับสแกนใหม่อีกครั้ง

### 1.4 Security: 30-Minute Scan-based Session Limit (ระบบเซสชันความปลอดภัย 30 นาที)
- เมื่อ Resolver ค้นพบอุปกรณ์ จะมีการสร้าง Session Cookie ชื่อ `qr_session_[TargetID]` ที่มีอายุสูงสุด **30 นาที** (`Max-Age=1800` วินาที)
- หลังจากสร้างคุกกี้แล้ว ระบบจะทำการ Redirect ไปยังหน้า Landing Page หลักของผู้ใช้นั้น `/public/checklist/targets/[TargetID]`
- หน้าแสดงผลปลายทางจะต้องตรวจสอบคุกกี้ตัวนี้ทุกครั้ง:
  - **กรณีพบคุกกี้และยังไม่หมดอายุ:** ให้แสดงข้อมูลอุปกรณ์และประวัติการตรวจตามปกติ
  - **กรณีคุกกี้ไม่มีอยู่หรือหมดอายุแล้ว:** หน้าจอจะต้องเปลี่ยนไปแสดงข้อความแจ้งเตือน **"Session Expired (เซสชันหมดอายุ) เพื่อความปลอดภัยของข้อมูล กรุณาสแกน QR Code ที่ตัวอุปกรณ์ใหม่อีกครั้ง"** เพื่อบล็อคไม่ให้เข้าถึงข้อมูลหากผู้ใช้นั้นบันทึก Bookmark URL เก็บไว้หรือคัดลอกลิงก์ไปแชร์ต่อให้ผู้อื่น

### 1.5 Public Target History Landing Page (หน้าจอประวัติสาธารณะแบบปฏิทิน)
- หน้าจอนี้จะเป็นหน้าสาธารณะ (ไม่ต้องผ่าน Authentication Middleware) เพื่อให้บุคคลทั่วไปหรือ Supervisor สามารถสแกนและตรวจสอบข้อมูลได้ทันที
- การแสดงผลข้อมูลหลักของตัวอุปกรณ์: รหัสอุปกรณ์, ชื่อ, สถานที่ตั้ง และข้อมูลจำเพาะ (Metadata)
- การแสดงผลประวัติการตรวจเช็คในรูปแบบ **Calendar View** แยกตามรอบความถี่ (Frequency) ของเทมเพลต:
  - **ความถี่รายเดือน (Monthly):** แสดงกล่องปฏิทินย้อนหลังรายปีแบ่งเป็น 12 กล่องตามรายเดือน (มกราคม - ธันวาคม)
  - **ความถี่รายวัน (Daily):** แสดงตารางปฏิทินเดือนปัจจุบันเป็นช่องรายวัน (1 - 31)
  - **การระบายรหัสสีของกล่องปฏิทินตามรอบงานตรวจ:**
    - 🟢 **สีเขียว (OK):** มีเอกสารการตรวจสถานะเสร็จสิ้น (`Closed`) และผลลัพธ์การตรวจเป็นปกติทั้งหมด
    - 🔴 **สีแดง (NG):** ตรวจพบความผิดปกติ (มีรายการผลการตรวจเป็น NG หรือเปิด Incident)
    - 🟠 **สีส้ม (Pending / In Progress):** มีใบงานเปิดอยู่แต่ยังตรวจไม่เสร็จ หรือตรวจเสร็จแล้วแต่รอการอนุมัติ (`Pending Approval`)
    - ⚪ **สีเทา (No Record / Not Checked):** ไม่มีประวัติการเปิดใบงานตรวจหรือไม่มีการลงบันทึกในรอบเวลาดังกล่าว
- **ปุ่มปิดหน้าจอ (Close Button):** มีปุ่มเด่นชัดสำหรับ "ปิดหน้าจอ / ปิดเซสชัน" เมื่อกดแล้วระบบจะลบ Cookie `qr_session` ทันที และพยายามปิดหน้าต่างแท็บเบราว์เซอร์บนอุปกรณ์เคลื่อนที่ เพื่อความปลอดภัยสูงสุดของข้อมูล

---

## 🗂️ 2. ไฟล์ที่ได้รับผลกระทบในระบบ (Affected Files)

ฟีเจอร์นี้จะส่งผลกระทบและต้องการการปรับแต่งหรือเขียนเพิ่มในไฟล์ต่างๆ ของโครงสร้าง DOWA IT System ดังต่อไปนี้:

### 2.1 โครงสร้างฐานข้อมูล (Database Schema & Scripts)
1. **[MODIFY] [migration_target_registry.sql](file:///c:/Users/Lenovo/dowa-it-system/scripts/migration_target_registry.sql)**
   - ปรับแต่งไฟล์โครงสร้างตาราง `checklist_template_targets` ให้เพิ่มคอลัมน์ `override_config JSONB` เพื่อเก็บข้อมูลการแยก Behavior ของอุปกรณ์
2. **[MODIFY] [seed_target_registry_uat_with_mappings.sql](file:///c:/Users/Lenovo/dowa-it-system/scripts/seed_target_registry_uat_with_mappings.sql)**
   - อัปเดตข้อมูลจำลอง UAT (Seeding) เพื่อใส่ข้อมูลแอร์ห้องเซิร์ฟเวอร์ `AC-SRV-001` และตู้ CCTV Terminal ทั้ง 5 จุด พร้อมแผนที่การผูกเทมเพลตและ behavior ตรวจสอบในระดับ UAT

### 2.2 โมดูลระบบหลังบ้านและการตรวจสอบ (Server Actions & Validation)
3. **[MODIFY] [checklistTemplateValidation.js](file:///c:/Users/Lenovo/dowa-it-system/lib/checklistTemplateValidation.js)**
   - เพิ่มการตรวจสอบโครงสร้าง Schema ผ่าน Zod สำหรับฟิลด์ `scope_mode`, `target_type` และเงื่อนไขการจัดเก็บของ `override_config` เพื่อป้องกันการบันทึกข้อมูล Behavior ผิดรูปแบบจากหน้า Setup
4. **[MODIFY] [checklist-template.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js)**
   - ปรับปรุงฟังก์ชันบันทึกและเซฟเทมเพลต (`saveChecklistTemplate`) เพื่อให้สามารถรับค่าและเซฟความสัมพันธ์ของเป้าหมายลงตาราง `checklist_template_targets` พร้อมค่า `override_config`
5. **[MODIFY] [public-checklist.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/public-checklist.js)**
   - เพิ่มฟังก์ชัน `getTargetHistoryPublic` เพื่อค้นหาข้อมูลและสรุปสถานะการตรวจย้อนหลังของเป้าหมาย (แยกสรุปเป็นรายเดือน/รายวันตามรอบความถี่) เพื่อส่งข้อมูลประวัติไปให้ปฏิทินเรนเดอร์ในหน้าสาธารณะ

### 2.3 ส่วนติดต่อผู้ใช้งาน (UI Components & Pages)
6. **[MODIFY] [TemplateForm.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/checklist-template-builder/components/TemplateForm.js)**
   - ปรับปรุงแบบฟอร์มเพิ่ม/แก้ไขเทมเพลต: เพิ่มฟิลด์เลือก `scope_mode`, `target_type`, และตารางเลือกอุปกรณ์เป้าหมาย (Targets/Groups) พร้อมสวิตช์ toggle การแยก Behavior รายตู้และแบบฟอร์มการกรอก config ย่อยรายเครื่อง
7. **[MODIFY] [ChecklistTemplateBuilderClient.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js)**
   - ดึงข้อมูลของ Targets และ Target Groups ที่มีอยู่ในระบบมาเก็บใน State เพื่อส่งผ่านไปแสดงผลใน component ลูกอย่าง `TemplateForm` ได้ถูกต้อง
8. **[MODIFY] [page.js (Public QR Resolver)](file:///c:/Users/Lenovo/dowa-it-system/app/public/checklist/qr/page.js)**
   - ใน Resolver เมื่อถอดรหัส `qr_value` สำเร็จ ให้เขียน Cookie `qr_session_[TargetID]` ที่ตั้งค่า `Max-Age=1800` (30 นาที) และ `HttpOnly=false` (หรือจัดการผ่าน Server-side Cookie response header) ก่อนส่งผู้ใช้งานไปหน้า Landing Page
9. **[NEW] [page.js (Public Target Calendar Landing)](file:///c:/Users/Lenovo/dowa-it-system/app/public/checklist/targets/%5BtargetId%5D/page.js)**
   - สร้างไฟล์หน้าจอตรวจสาธารณะสำหรับเป้าหมายหลัก:
     - ส่วนการดึงข้อมูลหัวข้ออุปกรณ์
     - ส่วนเช็ค Cookie เพื่อล็อคการเข้าถึงเมื่อเกิน 30 นาที
     - ส่วนการวาดตารางปฏิทินความร้อนสี (Calendar Status View) ตามรอบความถี่
     - ปุ่มปิดหน้าจอสำหรับเครียล์ Cookie และสั่งปิดเบราว์เซอร์
