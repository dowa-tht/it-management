<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 Agent Mandatory Workflow (กฎข้อบังคับสำหรับ AI)

1. **[BEFORE START]** ก่อนเริ่มทำงานทุกครั้ง **ต้องอ่านไฟล์ `docs/INDEX.md`** เป็นสิ่งแรกเสมอ เพื่อรับทราบโครงสร้างเอกสารปัจจุบัน และเลือกอ่านเฉพาะไฟล์ที่จำเป็นตามหัวข้องาน เพื่อลดปัญหา Context Overflow
2. **[PRIORITIZE STANDARDS]** ไม่ว่า USER จะใช้คำเรียกใดในระหว่างการสั่งงาน (เช่น "ปิดงาน", "Resolved", "เสร็จสิ้น") **AI ต้องยึดถือชื่อสถานะและ Logic ตามไฟล์มาตรฐาน (อ้างอิงจาก `docs/INDEX.md`) เป็นหลักเสมอ** ห้ามใช้ชื่อสถานะนอกเหนือจากที่กำหนดใน Standard
3. **[ZERO UI HACKS]** ห้าม AI เขียนโค้ดเพื่อดัดแปลงค่าแสดงผลให้ดูเหมือนถูกต้อง (เช่น `status === 'Resolved' ? 'Closed' : status`) หากพบข้อมูลในระบบไม่ตรงตามมาตรฐาน **ห้ามทำการแก้ขัดโดยเด็ดขาด** ให้แจ้ง USER ทันทีและเสนอทำการ Data Migration เพื่อแก้ไขข้อมูลที่ต้นทางให้ถูกต้องตามมาตรฐาน
4. **[CRITICAL LOGIC CONFIRMATION]** หากพบจุดที่มีความกำกวมหรือไม่มั่นใจในเงื่อนไขสำคัญของระบบ (Critical Logic/Workflow) **ต้องหยุดถาม USER พร้อมระบุป้าย `> [!IMPORTANT]`** เพื่อแจ้งเตือนทุกครั้งก่อนลงมือแก้ไข
4. **[DOCUMENTATION SYNC]** หลังจากการสอบถาม USER และได้รับการยืนยันการเพิ่มคำสั่งใหม่หรือเปลี่ยน Logic ใดๆ **ต้องอัปเดตข้อมูลลงในไฟล์ `.md` ที่เกี่ยวข้องทันที** เพื่อให้เอกสารสะท้อนสถานะปัจจุบันของระบบเสมอ
5. **[BEFORE END]** เมื่อจบงานในแต่ละวัน (หรือเมื่อ USER สั่งจบงาน) **ต้องทำการอัปเดตส่วน "Change Logs" ใน `docs/history/CHANGELOG.md`** โดยต้อง **ระบุวันที่และเวลา (Timestamp)** เข้าไปด้วยเสมอ เนื่องจากในหนึ่งวันอาจมีการบันทึกหลายครั้ง
6. **[DOCUMENTATION STRUCTURE]** หากมีการเพิ่มฟังก์ชันใหม่ หรือต้องการสร้างไฟล์ `.md` เพื่ออธิบายรายละเอียดระบบเพิ่มเติม **ห้ามสร้างไฟล์ `.md` ไว้ที่ Root Folder โดยเด็ดขาด** ให้สร้างไฟล์ไว้ภายใต้หมวดหมู่ย่อยในโฟลเดอร์ `docs/` เท่านั้น และหลังจากสร้างแล้ว **ต้องไปอัปเดตลิงก์อ้างอิงในแฟ้มสารบัญ `docs/INDEX.md` ให้เรียบร้อยเสมอ**


