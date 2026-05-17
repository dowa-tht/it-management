# Checklist_Core_Flow_And_Collaboration_005: การป้องกันการสร้างเอกสารซ้ำและการทำงานร่วมกันของ IT Staff

## วัตถุประสงค์
ดำเนินการปรับปรุงกระบวนการทำงานหลัก (Core Flow) ของระบบ Checklist ดังนี้:
1. **ป้องกันการสร้างเอกสารซ้ำแบบสากล (Global Duplicate Prevention):** เมื่อมีการสร้างเอกสาร Checklist ของเทมเพลตและความถี่ที่กำหนดในรอบช่วงเวลาหนึ่งๆ โดยผู้ใช้งานคนใดก็ตาม ผู้ใช้งานคนอื่น (รวมถึง Admin หรือ IT Staff คนอื่นๆ) จะไม่สามารถสร้างเอกสาร Checklist ซ้ำในเทมเพลตและความถี่เดียวกันของช่วงเวลานั้นได้อีก
2. **การทำงานร่วมกันบนเอกสารชุดเดียวกัน (Shared Document Collaboration):** ผู้ใช้งานที่มีบทบาทเป็น `admin` และ `it_staff` จะต้องสามารถมองเห็น เข้าถึง และดำเนินงานบันทึก/แก้ไขในเอกสาร Checklist และรายการย่อยต่างๆ ร่วมกันได้ (แชร์ข้อมูลร่วมกันใน Pool เดียวกัน) โดยไม่แบ่งแยกมุมมองตามผู้สร้างเอกสาร

---

## 1. บริบทและข้อผิดพลาดที่พบ

1. **การประกาศตัวแปรซ้ำซ้อนจนเกิดการแครช (Javascript Compilation Crash):**
   - **ไฟล์ที่พบปัญหา:** [app/dashboard/checklist/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js)
   - **รายละเอียดข้อผิดพลาด:** มีการใช้คำสั่ง `const` ประกาศตัวแปร `selectedTemplates` ซ้ำกันถึงสองครั้งในฟังก์ชัน `handleFinalCreate()` ที่**บรรทัด L718** และ**บรรทัด L746** ทำให้เกิดข้อผิดพลาดในการคอมไพล์โค้ด (Compile-time crash)
   - **แนวทางแก้ไข:** ลบคำสั่ง `const` ออกที่บรรทัด L746 เพื่อใช้ตัวแปรเดิมที่ประกาศไว้แล้วใน Scope ด้านบน

2. **ไฟล์ SQL Migration ค้างอยู่ (Pending SQL Migration):**
   - **ไฟล์ที่เกี่ยวข้อง:** [supabase/migrations/20260517_checklist_collaboration.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260517_checklist_collaboration.sql)
   - **รายละเอียด:** ไฟล์อัปเดตระบบความปลอดภัยและสิทธิ์การเข้าถึงข้อมูลร่วมกันยังไม่ถูกรันเข้าสู่ฐานข้อมูล PostgreSQL ในเครื่อง Local
   - **แนวทางแก้ไข:** รัน SQL Statements ในไฟล์ดังกล่าวทั้งหมดเพื่อเปิดใช้งานและปรับปรุงระบบความปลอดภัย/RLS

---

## 2. ขั้นตอนการทำงานเชิงเทคนิคสำหรับ Fast AI (Jules)

### ขั้นตอนที่ 1: แก้ไขข้อผิดพลาดไวยากรณ์ JavaScript ใน page.js
* **ไฟล์เป้าหมาย:** [app/dashboard/checklist/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js)
* **จุดที่ต้องแก้ไข:** L746
* **การดำเนินการ:**
  แก้ไขบรรทัด:
  ```javascript
  const selectedTemplates = items.filter(t => selectedTemplateIds.includes(t.selection_key))
  ```
  ให้เปลี่ยนเป็น:
  ```javascript
  // ใช้ตัวแปร selectedTemplates ที่ประกาศไว้ด้านบน
  ```
  *(หรือลบคำสั่ง `const` ออกเพื่อให้เป็นการกำหนดค่าซ้ำธรรมดา หรือลบบรรทัดที่ซ้ำซ้อนนั้นทิ้งไปเลย เนื่องจากมีการกรองเก็บค่าไว้เรียบร้อยแล้วที่ L718)*

---

### ขั้นตอนที่ 2: รันไฟล์ SQL Migration
* **ไฟล์เป้าหมาย:** [supabase/migrations/20260517_checklist_collaboration.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260517_checklist_collaboration.sql)
* **การดำเนินการ:**
  - รันคำสั่ง SQL ทั้งหมดภายในไฟล์นี้เข้าสู่ฐานข้อมูล PostgreSQL
  - การดำเนินการนี้จะทำการ:
    1. ปรับปรุงฟังก์ชันความปลอดภัย `public.current_user_can_access_checklist_doc(uuid)` ให้ส่งค่ากลับเป็น `true` ทันทีเมื่อผู้ใช้ปัจจุบันเป็นบทบาท `admin` หรือ `it_staff`
    2. ลบและสร้างนโยบายความปลอดภัย (Update Policy) ของตาราง `checklist_docs` ใหม่เพื่อให้ `admin` และ `it_staff` ร่วมมือกันแก้ไขข้อมูลได้
    3. ลบและสร้างนโยบายความปลอดภัย (Insert, Update, Delete Policies) ของตาราง `checklist_items` เพื่อสืบทอดสิทธิ์การตรวจสอบผ่านฟังก์ชันตรวจเอกสารโดยตรง
    4. เปิดใช้งาน RLS (Row Level Security) บนตารางเป้าหมายที่สำคัญ ได้แก่ `checklist_targets`, `checklist_target_groups`, `checklist_template_targets` พร้อมเพิ่มนโยบายความปลอดภัยการเข้าอ่าน (Select) และการจัดการของ Admin (All) เพื่อปิดช่องโหว่ความปลอดภัย

---

### ขั้นตอนที่ 3: ตรวจสอบและทดสอบ Logic การป้องกันการสร้างซ้ำ
* **ตรวจสอบจุด Logic:**
  - ในฟังก์ชัน `handleFinalCreate` ของไฟล์ [app/dashboard/checklist/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js):
    ```javascript
    const range = getPeriodRange(date, freq)
    const { data: periodDocs } = await supabase
      .from('checklist_docs')
      .select('id')
      .eq('freq_type', freq)
      .gte('period_date', range.start)
      .lte('period_date', range.end)
    ```
  - เนื่องจาก RLS SELECT Policy ของตาราง `checklist_docs` ถูกปรับปรุงให้สิทธิ์แก่ `admin` และ `it_staff` มองเห็นเอกสารได้ทุกอันแล้ว ฟังก์ชันนี้จะดึงรายการเอกสาร Checklist ของทุกคนในรอบนั้นขึ้นมาตรวจสอบได้จริง และจะบล็อกการสร้างซ้ำได้สมบูรณ์ข้ามระหว่างบัญชีผู้ใช้งาน
* **การตรวจสอบความถูกต้อง:** ตรวจสอบให้มั่นใจว่าห้ามมีการใส่ filter กรองสิทธิ์ผู้สร้างทางฝั่ง Client ในคิวรีนี้เด็ดขาดเพื่อให้การเช็คเป็นแบบ Global เสมอ

---

### ขั้นตอนที่ 4: รันชุดทดสอบเพื่อยืนยันผลลัพธ์
* **การดำเนินการ:**
  - รันคำสั่งทดสอบระบบ `npm test` เพื่อตรวจสอบความสมบูรณ์และยืนยันว่าโค้ดคอมไพล์ผ่าน รวมถึง Unit/Integration Tests ทุกตัวยังคงให้ผลการทดสอบเป็น Pass 100%
  - เปิดเซิร์ฟเวอร์จำลองการรันจริง (`npm run dev`) เพื่อเตรียมพร้อมให้ผู้ใช้งานใช้งาน

---

## 3. เกณฑ์ความสำเร็จและการตรวจสอบความถูกต้อง
- **ไม่มี Compile Error:** หน้า Checklist บนเว็บต้องโหลดสำเร็จและไม่มีข้อผิดพลาดแจ้งทาง Browser Console
- **RLS ตารางเป้าหมายผ่านการรักษาความปลอดภัย:** ตารางทั้ง 3 ตารางได้รับการเปิดใช้งาน RLS อย่างสมบูรณ์และปลอดภัย
- **รันเทสผ่าน 100%:** ผลการทดสอบจากคำสั่ง `npm test` แสดงผลเป็น Pass 100% ไม่มี Regression

---
*จัดทำแผนงานความยืดหยุ่นทางเทคนิคโดย Antigravity (Smart AI) เมื่อ 2026-05-17*
