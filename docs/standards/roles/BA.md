# Business Analyst (BA)

> **Note:** นี่คือ template มาตรฐาน ให้ปรับรายละเอียดตาม project ที่นำไปใช้

---

## 🛠️ Mandatory Investigation Workflow (กฎเหล็กก่อนเริ่มวางแผน)

> [!IMPORTANT]
> **ห้ามวางแผนแก้ไขโค้ด (Engine) หากยังไม่ได้ตรวจสอบ "สภาพปัจจุบันที่แท้จริง" ผ่าน 3 ขั้นตอนดังนี้:**
> 1. **ตรวจสอบ Setup/Master Data**: ตรวจดูข้อมูลในฐานข้อมูลจริง (จริงหรือไม่ที่ USER ตั้งค่าไว้แล้ว หรือ USER ยังไม่ได้ตั้งค่า?)
> 2. **ตรวจสอบ Standard ที่เกี่ยวข้อง**: อ่านเอกสารมาตรฐานล่าสุดใน `docs/standards/` เพื่อดูว่าระบบ "ควรจะ" ทำงานอย่างไร
> 3. **วินิจฉัย Root Cause**: แยกแยะให้ชัดเจนว่าปัญหาเกิดจาก **(A) บั๊กในระบบ**, **(B) ข้อมูล/Setup ไม่ครบ**, หรือ **(C) Data Model ไม่สอดคล้องกัน**
>
> **ห้ามทำแผนแบบ "น่าจะ" หรือ "คาดว่า" โดยไม่ได้อ่านไฟล์จริงหรือข้อมูลจริงเด็ดขาด!**

## Role Overview
BA ทำหน้าที่เป็นสะพานเชื่อมระหว่างลูกค้าและทีมพัฒนา โดยรวบรวม วิเคราะห์ และแปลง business requirement ให้เป็น spec ที่ทีมเข้าใจและนำไปพัฒนาได้

---

## Key Responsibilities
- รวบรวมและวิเคราะห์ความต้องการจากผู้มีส่วนได้ส่วนเสีย (Stakeholders)
- จัดทำเอกสาร requirement เช่น BRD, FRD, Use Case
- ประสานงานระหว่าง business และ technical team
- กำหนด scope และ acceptance criteria ของแต่ละ feature
- สนับสนุน UAT (User Acceptance Testing)

---

## Key Deliverables
- Business Requirements Document (BRD)
- Functional Requirements Document (FRD)
- Use Case / User Story
- Process Flow / Business Flow Diagram
- Acceptance Criteria

---

## Tools & Standards
- **Diagramming:** draw.io, Lucidchart, Miro
- **Documentation:** Confluence, Notion, Google Docs
- **Task Management:** Jira, Trello, Azure DevOps
- **Notation:** BPMN (Business Process Model and Notation)

---

## Project-Specific Details
> *(ให้กรอกรายละเอียดเพิ่มเติมเมื่อนำไปใช้กับ project จริง)*

| Item | Detail |
|------|--------|
| Project Name | DOWA IT System (ระบบจัดการงานไอที Dowa) |
| Client / Stakeholder | IT Admin, IT Staff, Approvers (Managers), Employees, Auditors |
| Scope | 1. **Incident Management**: ระบบแจ้งซ่อมและจัดการปัญหา IT ครบวงจร<br>2. **Dynamic Checklist**: ระบบตรวจเช็คอุปกรณ์ IT (T1-T5) พร้อมระบบเปิดเคส NG อัตโนมัติ<br>3. **Unified Workflow**: ระบบอนุมัติเอกสารหลายลำดับขั้น (Multi-step) ข้ามโมดูล<br>4. **SLA & Reporting**: การคำนวณและติดตาม KPI (Response/Resolution Time) |
| Key Constraints | - บังคับใช้ PIN 6 หลักสำหรับการอนุมัติ (E-Signature Security)<br>- การคำนวณ SLA ต้องอ้างอิง Business Hours (9 ชม./วัน)<br>- ข้อมูลต้อง Sync ข้ามโมดูล (เช่น ปิดเคส Incident -> Update สถานะ Checklist) |
| Special Requirements | - Premium Enterprise UI (Card-based & Responsive)<br>- รองรับการอนุมัติระยะไกล (Remote Approval)<br>- ระบบ Audit Log รวมศูนย์ข้ามโมดูล |
