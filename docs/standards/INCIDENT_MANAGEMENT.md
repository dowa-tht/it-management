# 🚨 Incident Management Standard

**Version**: 1.0 (2026-05-09)  
**Status**: Mandatory Standard  
**Scope**: IT Service Desk & Technical Support Workflow

---

## 1. Incident Lifecycle & Statuses
เพื่อให้สถานะของงานมีความชัดเจนและเป็นไปตามมาตรฐาน Unified Workflow ระบบจะใช้สถานะมาตรฐานดังนี้:

| สถานะ (Status) | คำอธิบาย (Description) | พฤติกรรมระบบ (System Behavior) |
| :--- | :--- | :--- |
| **⚪ Open** | แจ้งเรื่องใหม่ ยังไม่มีเจ้าหน้าที่รับงาน | เริ่มนับ Response SLA / **ต้องแสดงในกล่อง "รอรับเรื่อง" บน Dashboard IT** |
| **⏳ In Progress** | เจ้าหน้าที่กดรับงานหรือมอบหมายงานแล้ว | หยุดนับ Response SLA / เริ่มนับ Resolution SLA / **Lock ข้อมูลห้ามผู้แจ้งแก้ไข** |
| **✍️ Pending Approval** | แก้ไขเสร็จสิ้น อยู่ระหว่างรอผู้แจ้งเซ็นรับทราบ | หยุดนับ Resolution SLA (Clock Stopped) |
| **✅ Closed** | ผู้แจ้งเซ็นรับทราบและปิดงานสมบูรณ์ | บันทึกสถิติ SLA ลงในรายงาน |

---

## 2. Data Integrity & Reporting
การบันทึกข้อมูลต้องเป็นไปตามมาตรฐานเพื่อความแม่นยำในการทำ Audit และ Reporting:

*   **Identities**: ทุก Incident ต้องจัดเก็บทั้ง `reported_by` / `assigned_to` (ชื่อแสดงผล) และ `reported_by_id` / `assigned_to_id` (UUID) เสมอ เพื่อความแม่นยำในการทำ Audit และ Ownership
*   **Automatic No. Series**: เลขที่เคสต้องถูกสร้างโดยระบบผ่านฟังก์ชัน `getNextNo('INC')` เท่านั้น ห้าม Gen เลขขึ้นมาเองโดยไม่มี Prefix/Suffix ที่ถูกต้อง
*   **Case Redundancy**: ห้ามสร้างเคสซ้ำซ้อนสำหรับอาการเดียวกัน หากพบเคสเดิมต้องทำการ Update ใน Log เดิมแทน
*   **Ownership & Locking**: เมื่อเคสเข้าสู่สถานะ `In Progress` หรือสูงกว่า เฉพาะผู้รับผิดชอบ (Assignee) หรือ Administrator เท่านั้นที่มีสิทธิ์แก้ไขรายละเอียด หรือส่งงานอนุมัติ ผู้แจ้ง (Reporter) จะถูก Lock สิทธิ์ในการแก้ไขเพื่อป้องกัน Data Conflict

---

## 3. Data Filtering Standard ("My Incidents")
การกรองข้อมูลส่วนบุคคลในหน้า Dashboard และ List Page ต้องใช้เกณฑ์ที่ยืดหยุ่นและครอบคลุม:

*   **Primary Filter**: ต้องใช้ `reported_by_id` เพื่อความแม่นยำสูงสุด
*   **Fallback Filters**: ใช้การค้นหาแบบ `ilike` (Case-insensitive) กับชื่อ และอีเมล
*   **Context Inclusion**: สำหรับเจ้าหน้าที่ IT ฟังก์ชัน "งานของฉัน" ต้องรวมเคสที่ผู้ใช้คนนั้นเป็น **"ผู้รับผิดชอบ (Assigned To)"** เข้าไปด้วย

---

## 4. Real-time SLA Monitoring (Strict Mode)
ระบบต้องประเมินประสิทธิภาพแบบ Real-time เพื่อให้ Dashboard สะท้อนสถานะวิกฤตที่แท้จริง:

*   **Late Detection**: เคสที่ยังอยู่ในสถานะ `Open` หรือ `In Progress` แต่เวลาปัจจุบันเกินเป้าหมาย (SLA Target) แล้ว **ต้องถูกแสดงผลเป็นสีแดง (FAIL)** ทันที
*   **Rate Calculation**: เคสที่ "สาย (Late)" แบบ Real-time ต้องถูกนำไปหักลบในอัตราส่วน % ความสำเร็จ (Compliance Rate) โดยไม่ต้องรอให้ปิดงานก่อน

---

## 5. UI/UX Standard for Incidents
*   **Visual Indicators**: ใช้รหัสสี (🔴 High, 🟠 Medium, 🟢 Low) และ Emoji กำกับสถานะเสมอ
*   **Quick Actions**: ในหน้า List ต้องมีปุ่มทางลัดในการกดรับงาน (Assign to Me) เพื่อลดระยะเวลา Response Time
*   **Consistency**: การแสดงผลวันเวลาต้องใช้ฟังก์ชัน `formatDate` หรือ `formatDateTime` มาตรฐานเท่านั้น

---

## 6. Incident Accept / Dispatch Role Standard
เพื่อให้สอดคล้องกับหลัก Audit และ Segregation of Duties ระบบต้องแยกบทบาทผู้รับงานจริงกับผู้มอบหมายงานดังนี้:

*   **IT Staff Accept**: เฉพาะ `it_staff` เท่านั้นที่สามารถกดรับเรื่อง (Accept/Acknowledge) แล้วเป็นผู้รับผิดชอบงาน (`assigned_to_id`) ของตนเองได้ทันที
*   **Administrator Dispatch**: `admin` สามารถมอบหมายงาน (Dispatch) ได้เท่านั้น โดยต้องเลือกผู้รับผิดชอบที่เป็น `it_staff` และ `is_active = true` ก่อนบันทึก
*   **Assignee Restriction**: ห้าม `admin` ถูกบันทึกเป็น `incidents.assigned_to_id` ผ่าน Accept/Dispatch flow ผู้รับผิดชอบงานจริงต้องเป็น `it_staff` เท่านั้น
*   **Audit Log Separation**: ต้องแยก Log ระหว่าง `รับเรื่อง (Acknowledge)` สำหรับ IT Staff และ `มอบหมายงาน (Dispatch)` สำหรับ Administrator ให้ชัดเจน
*   **Role-derived Assignee**: สถานะ Assignee สำหรับ Incident อ้างอิงจาก `role === 'it_staff'` ไม่ใช้ `can_be_assignee` เป็น Source of Truth

---
*จัดทำมาตรฐานโดย AI Agent (Antigravity)*
