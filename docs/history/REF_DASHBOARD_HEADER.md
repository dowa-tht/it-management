# 📋 แผนการปรับปรุง Dashboard Header & My Sent Pending

เอกสารนี้ระบุแผนการทำงานและรายละเอียดเงื่อนไขของกล่อง "Approvals" และ "My Sent Pending" เพื่อดำเนินการย้าย Header ไปให้ครอบคลุมทุกบทบาท (Global & Employee Dashboard)

## 1. การย้าย Section Header ให้เป็น Global (แสดงผลบนทุก Dashboard)
ปัจจุบันกรอบหัวข้อ (Dashboard Title, Date, และกล่อง Approvals, My Sent Pending) ถูกเรนเดอร์แยกกันและปรากฏเฉพาะในหน้าที่แสดงผลแบบ IT/Admin (`app/dashboard/page.js` ส่วน `return` หลัก) แต่ไม่ปรากฏใน `EmployeeDashboard` 

**สิ่งที่ต้องทำ:**
- ดึงโค้ดส่วน `div.header-flex` ที่แสดง "Dashboard", วันที่, และกล่อง 🔔 Approvals / 📤 My Sent Pending ออกมาเป็น Component เดี่ยว (เช่น `DashboardHeader`)
- นำ `<DashboardHeader />` ไปเรียกใช้เป็นส่วนแรกสุดใน `app/dashboard/page.js` ทั้งก่อนที่จะแยกเงื่อนไข Role (หรือนำไปใส่ในจุดที่ทุกคนเห็นร่วมกัน ไม่ว่าจะ Role อะไร)

## 2. การทำงานของกล่อง Approvals
*   **เงื่อนไขปัจจุบัน:** ดึงข้อมูลจากตาราง `document_approvals` ในสถานะ `pending` โดยตรวจสอบว่า `approver_id` ตรงกับ UUID ของผู้ใช้ **หรือ** หาก `approver_id` ว่างเปล่า จะเช็คว่า `role_required` ตรงกับ Role ของผู้ใช้หรือไม่
*   **การแสดงผลที่ถูกต้อง:** หาก Employee เป็นผู้แจ้ง (Requester) และ IT ส่งขออนุมัติมา (Require Reporter Signature) ระบบ Workflow จะนำ UUID ของ Employee ไปผูกกับ `approver_id` ในขั้นตอนนั้นโดยอัตโนมัติ (เพิ่งเพิ่มฟีเจอร์ Role Injection เข้าไป) ดังนั้น กล่อง Approvals **จะแสดงเลขแจ้งเตือนให้ Employee (Requester) เห็นอย่างถูกต้องแน่นอน**

## 3. การทำงานและเงื่อนไขของกล่อง My Sent Pending
**"My Sent Pending"** หมายถึง *"เอกสารที่ฉันเป็นคนแจ้งหรือสร้างขึ้น และกำลังรอให้ผู้อื่น (หรือตัวเอง) ดำเนินการอนุมัติอยู่"*

**เงื่อนไขการคำนวณตัวเลข (ต้องปรับปรุง):**
ตัวเลขนี้คือผลรวมของ 2 ส่วนคือ Checklist และ Incidents:
1.  **Checklists:** ระบบจะนับเอกสารจาก `checklist_docs` ที่มีสถานะเป็น `Pending Approval` (หรือเทียบเท่า) **และ** `created_by` ตรงกับ Email ของผู้ใช้
2.  **Incidents:** ระบบจะนับเอกสารจากตาราง `incidents` ที่มีสถานะ `Pending Approval` **และ** `reported_by` ตรงกับ Email ของผู้ใช้

**ช่องโหว่ที่ต้องแก้ไข (Bug Fix in Plan):**
ปัจจุบันใน `app/actions/dashboard.js` ดึงค่าของ Incident ด้วยเงื่อนไข `.eq('reported_by', userProfile.email)`. แต่เนื่องจากฟิลด์ `reported_by` อาจมีการบันทึกเป็น "ชื่อ-สกุล" ในบางเคสแทนที่จะเป็นอีเมล ทำให้การนับจำนวนอาจตกหล่น
*   **วิธีแก้:** เปลี่ยนจากการเทียบชื่อ/อีเมล (String) ไปใช้ฟิลด์อ้างอิง UUID ที่แม่นยำกว่า เช่น `reported_by_id.eq.${userProfile.id}` เพื่อให้ตัวเลขสะท้อนค่าที่ถูกต้อง 100%

---
**Next Step:** เมื่อได้รับการอนุมัติแผนนี้ จะเริ่มแก้โค้ดเพื่อ Extract Component และแก้ Query ของ My Sent Pending ตามที่ระบุไว้
