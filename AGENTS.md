<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 Agent Mandatory Workflow (กฎข้อบังคับสำหรับ AI)

1. **[BEFORE START]** ก่อนเริ่มทำงานทุกครั้ง **ต้องตรวจสอบบทบาท (Role) ของตัวเองใน `docs/standards/roles/` (หากมีการระบุ)** และต้องอ่านไฟล์ **`docs/INDEX.md`** และ **`docs/history/USER_TASKS.md`** เป็นลำดับถัดไป เพื่อรับทราบโครงสร้างเอกสารปัจจุบัน และตรวจสอบงานที่ USER โน้ตค้างไว้ เพื่อแจ้งเตือนหรือ Remind USER ถึงสิ่งที่ต้องทำต่อไป
2. **[PRIORITIZE STANDARDS]** ไม่ว่า USER จะใช้คำเรียกใดในระหว่างการสั่งงาน (เช่น "ปิดงาน", "Resolved", "เสร็จสิ้น") **AI ต้องยึดถือชื่อสถานะและ Logic ตามไฟล์มาตรฐาน (อ้างอิงจาก `docs/INDEX.md`) เป็นหลักเสมอ** ห้ามใช้ชื่อสถานะนอกเหนือจากที่กำหนดใน Standard
3. **[ZERO UI HACKS]** ห้าม AI เขียนโค้ดเพื่อดัดแปลงค่าแสดงผลให้ดูเหมือนถูกต้อง (เช่น `status === 'Resolved' ? 'Closed' : status`) หากพบข้อมูลในระบบไม่ตรงตามมาตรฐาน **ห้ามทำการแก้ขัดโดยเด็ดขาด** ให้แจ้ง USER ทันทีและเสนอทำการ Data Migration เพื่อแก้ไขข้อมูลที่ต้นทางให้ถูกต้องตามมาตรฐาน
4. **[CRITICAL LOGIC CONFIRMATION]** หากพบจุดที่มีความกำกวมหรือไม่มั่นใจในเงื่อนไขสำคัญของระบบ (Critical Logic/Workflow) **ต้องหยุดถาม USER พร้อมระบุป้าย `> [!IMPORTANT]`** เพื่อแจ้งเตือนทุกครั้งก่อนลงมือแก้ไข
4. **[DOCUMENTATION SYNC]** หลังจากการสอบถาม USER และได้รับการยืนยันการเพิ่มคำสั่งใหม่หรือเปลี่ยน Logic ใดๆ **ต้องอัปเดตข้อมูลลงในไฟล์ `.md` ที่เกี่ยวข้องทันที** เพื่อให้เอกสารสะท้อนสถานะปัจจุบันของระบบเสมอ
5. **[BEFORE END]** เมื่อจบงานในแต่ละวัน (หรือเมื่อ USER สั่งจบงาน) **ต้องทำการอัปเดตส่วน "Change Logs" ใน `docs/history/CHANGELOG.md`** โดยต้อง **ระบุวันที่และเวลา (Timestamp)** เข้าไปด้วยเสมอ เนื่องจากในหนึ่งวันอาจมีการบันทึกหลายครั้ง
6. **[DOCUMENTATION STRUCTURE]** หากมีการสร้างไฟล์ `.md` ใหม่ **ห้ามสร้างไว้ที่ Root Folder โดยเด็ดขาด** และ AI ต้องจัดหมวดหมู่ไฟล์ให้ถูกต้องตามประเภทงานเสมอ:
   - **Development Standards**: เก็บใน `docs/standards/` (สำหรับกฎและ Logic)
   - **Implementation History**: เก็บใน `docs/history/` (สำหรับบันทึกการทำงาน/Audit)
   - **Manuals & Guides**: เก็บใน `docs/manuals/` (สำหรับคู่มือการใช้งาน)
   และหลังจากสร้างแล้ว **ต้องไปอัปเดตลิงก์ใน `docs/INDEX.md` ตามหมวดหมู่ให้เรียบร้อยเสมอ**
7. **[EVIDENCE-BASED VERIFICATION]** เมื่อ USER ถามหรือสั่งให้ "ตรวจสอบ", "ดูว่า...", "ระบบทำงานถูกต้องไหม" หรือคำสั่งในลักษณะเดียวกัน **AI ต้องดำเนินการดังนี้โดยไม่มีข้อยกเว้น**:
   - **อ่านไฟล์จริง**: ใช้ `view_file` หรือ `grep_search` อ่านโค้ดหรือไฟล์ที่เกี่ยวข้องจริงๆ ก่อนตอบ **ห้ามตอบจากความจำ**
   - **อ้างอิงหลักฐาน**: คำตอบต้องระบุ ชื่อไฟล์ + หมายเลขบรรทัด + โค้ดที่เกี่ยวข้อง เพื่อพิสูจน์คำตอบ เช่น `app/actions/workflow.js:L75 — applySignaturesToWorkflow() ถูกเรียกหลัง generateWorkflowSteps()`
   - **เปรียบเทียบกับมาตรฐาน**: ต้องระบุด้วยว่าโค้ดที่พบ **สอดคล้อง** หรือ **ไม่สอดคล้อง** กับมาตรฐานใน `docs/standards/` โดยอ้างอิง Section ที่เกี่ยวข้อง
   - **ห้ามตอบแบบ "น่าจะ" หรือ "โดยทั่วไป"**: หากไม่แน่ใจให้ระบุว่า "ยังไม่ได้ตรวจสอบโค้ดจริง กำลังดำเนินการ..." แล้วไปอ่านไฟล์ก่อนตอบ
   - **รายงานตามความจริง**: หากพบว่าโค้ดยังไม่เป็นไปตามมาตรฐาน **ต้องรายงานตรงๆ** พร้อมระบุจุดที่ไม่ตรงและเสนอแนวทางแก้ไข ห้ามรายงานว่า "ถูกต้องแล้ว" หากยังไม่ตรวจสอบจริง
8. **[DAILY LOG SHRINKING]** เมื่อ USER แจ้งว่า "เริ่มงานได้" หรือก่อนเริ่มงานในวันใหม่ทุกครั้ง **AI ต้องตรวจสอบวันที่ล่าสุดใน `docs/history/CHANGELOG.md` ทันที** หากวันที่ปัจจุบันไม่ตรงกับวันที่ล่าสุดใน Changelog ต้องทำการย้าย (Archive) บันทึกของวันก่อนหน้าทั้งหมดไปไว้ในไฟล์ `docs/history/archive/CHANGELOG_YYYY_MM_DD.md` ก่อนเริ่มงานหรือก่อนบันทึกงานใหม่ เพื่อรักษาขนาดไฟล์ `CHANGELOG.md` ให้กะทัดรัดและทำงานได้รวดเร็วเสมอ
9. **[DOUBLE-VERIFICATION BEFORE CONFIRMATION]** ห้ามตอบ USER ว่า "อัปเดตแล้ว", "แก้ไขแล้ว" หรือ "บันทึกแล้ว" จนกว่าจะได้ทำการ **ตรวจสอบไฟล์จริง** (View File) อีกครั้งหลังจากส่งคำสั่งแก้ไข เพื่อยืนยันว่าการบันทึกสำเร็จและข้อมูลถูกต้อง 100% ห้ามตอบจากสถานะของ Tool เพียงอย่างเดียว
10. **[NON-INTUITIVE DETAILED PLANNING]** ในการทำ Implementation Plan ห้ามใช้ "ความรู้สึก" หรือ "ความน่าจะเป็น" ในการกำหนด Logic หากจุดใดมีความซับซ้อน **ต้องระบุเป็น Technical Logic/Pseudocode** ให้ละเอียดถึงระดับฟิลด์ข้อมูลและเงื่อนไข (If/Else) เพื่อป้องกัน Agent อื่นๆ ตีความผิดพลาด
11. **[VISUAL EVIDENCE ANALYSIS]** เมื่อ USER ส่งรูปภาพ (Screenshot) มาเพื่อแจ้งปัญหาการแสดงผล (UI/UX) หรือ Error **AI ต้องวิเคราะห์จากภาพจริงที่เห็นเป็นลำดับแรก** ห้ามตอบว่า "สวยแล้ว" หรือ "แก้ไขแล้ว" โดยดูเพียงแค่โค้ดหากภาพจริงยังแสดงความผิดพลาดหรือความไม่สวยงาม AI ต้องยอมรับความจริงตามภาพหลักฐานและดำเนินการแก้ไขจนกว่าผลลัพธ์ในภาพจะถูกต้อง 100%

---

# Project Agent Rules

## Stack
- Next.js 15 App Router (ห้ามใช้ Pages Router เด็ดขาด)
- Tailwind CSS v4
- Supabase (ใช้ SSR client เสมอ ห้ามใช้ browser client ใน Server Component)
- TypeScript strict mode

## การเขียนโค้ด
- Component ทุกตัวต้องระบุ `"use client"` หรือ `"use server"` ให้ชัดเจน
- ห้าม fetch ข้อมูลใน Client Component โดยตรง ให้ผ่าน Server Action หรือ Route Handler
- ใช้ `cn()` จาก clsx/tailwind-merge ทุกครั้งที่ต่อ className

## Supabase / Database
- ตรวจ RLS policy ก่อน query ทุกครั้ง
- ใช้ generated types จาก `supabase gen types` เสมอ ห้าม any
- อย่าเปิด service_role key ใน client-side

## การทำงานของ Agent
- ก่อนแก้ไฟล์ ให้อ่านไฟล์นั้นก่อนเสมอ
- ถ้าไม่แน่ใจ spec ให้ถามก่อน อย่า assume
- แก้ทีละ task ให้เสร็จก่อน อย่ากระโดดข้าม
- ใช้ Context7 ทุกครั้งที่ต้องการ docs ของ library

---

# 🕵️ Project Audit / Project Checker Role (บทบาทผู้ตรวจสอบโครงการ)

เมื่อ USER สั่งให้ AI ทำหน้าที่เป็น **Project Checker** หรือ **Auditor** ให้ปฏิบัติตามมาตรฐานดังนี้:

1.  **[CORE DUTY]** หน้าที่หลักคือการตรวจสอบ (Audit) ความสอดคล้องระหว่าง **"โค้ดจริง (Source Code)"** กับ **"เอกสารมาตรฐาน (Standards)"** ใน `docs/standards/`
2.  **[GAP IDENTIFICATION]** หากพบฟังก์ชันในโค้ดที่ทำงานได้จริงแต่ยังไม่มีในเอกสารมาตรฐาน **ต้องทำการอัปเดตเอกสารมาตรฐานทันที** เพื่อให้เอกสารเป็น Source of Truth ที่สมบูรณ์
3.  **[DOCUMENTATION AUDIT]** ตรวจสอบว่ามีเอกสารครบทั้ง 3 ประเภทหลักหรือไม่:
    - **Development Standards**: มาตรฐานการพัฒนาระบบ (สำหรับ Agent)
    - **Implementation History**: บันทึกการดำเนินการและประวัติการเปลี่ยนแปลง (สำหรับ Audit)
    - **Manuals & Guides**: คู่มือการใช้งานและขั้นตอนการทำงาน (สำหรับ User/Developer)
4.  **[REPORTING STANDARD]** การรายงานผลต้องใช้หลักการ **Evidence-Based** (อ้างอิงไฟล์และหมายเลขบรรทัด) และต้องระบุสถานะความถูกต้องตามความเป็นจริงเสมอ (ห้าม UI Hacks หรือตอบแบบคาดเดา)
