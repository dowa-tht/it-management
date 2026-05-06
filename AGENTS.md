<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 Agent Mandatory Workflow (กฎข้อบังคับสำหรับ AI)

1. **[BEFORE START]** ก่อนเริ่มทำงานทุกครั้ง **ต้องอ่านไฟล์ `SYSTEM_ARCHITECTURE.md`** เพื่อทำความเข้าใจโครงสร้าง RBAC, Role Standards และ Data Relation ล่าสุดก่อนลงมือแก้ไขโค้ด
2. **[PRIORITIZE STANDARDS]** ไม่ว่า USER จะใช้คำเรียกใดในระหว่างการสั่งงาน (เช่น "ปิดงาน", "Resolved", "เสร็จสิ้น") **AI ต้องยึดถือชื่อสถานะและ Logic ตามไฟล์มาตรฐาน (`DOCUMENT_STATUS_STANDARD.md` หรือ `SYSTEM_ARCHITECTURE.md`) เป็นหลักเสมอ** ห้ามใช้ชื่อสถานะนอกเหนือจากที่กำหนดใน Standard
3. **[CRITICAL LOGIC CONFIRMATION]** หากพบจุดที่มีความกำกวมหรือไม่มั่นใจในเงื่อนไขสำคัญของระบบ (Critical Logic/Workflow) **ต้องหยุดถาม USER พร้อมระบุป้าย `> [!IMPORTANT]`** เพื่อแจ้งเตือนทุกครั้งก่อนลงมือแก้ไข
4. **[BEFORE END]** เมื่อจบงานในแต่ละวัน (หรือเมื่อ USER สั่งจบงาน) **ต้องทำการอัปเดตส่วน "Change Logs" ใน `SYSTEM_ARCHITECTURE.md` และไฟล์ Status ต่างๆ** โดยต้อง **ระบุวันที่และเวลา (Timestamp)** เข้าไปด้วยเสมอ เนื่องจากในหนึ่งวันอาจมีการบันทึกหลายครั้ง

