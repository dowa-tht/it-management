<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 🤖 Agent Mandatory Workflow (กฎข้อบังคับสำหรับ AI)

> กฎทุกข้อในส่วนนี้มีผลบังคับใช้กับ AI ทุก Model ทุก Role โดยไม่มีข้อยกเว้น

## 🎚️ Task Criticality Tiers (Balanced Execution)

เพื่อให้การทำงานเร็วขึ้นในงานเล็ก แต่ยังคงความปลอดภัยในงานสำคัญ ให้จัดประเภทงานก่อนเริ่มทุกครั้งดังนี้:

- **Quick**: งานเล็กที่ไม่กระทบ Business Logic หรือ Security เช่น แก้คำ, ปรับข้อความ, ปรับ Markdown, ปรับ UI spacing เล็กน้อย
- **Standard**: งานพัฒนา/แก้ไขเฉพาะจุดที่มีผลกับพฤติกรรมระบบบางส่วน แต่ไม่แตะ security-critical flow
- **Critical**: งานที่แตะ Security Boundary, RBAC, RLS, PIN, Approval Workflow, Database schema/migration, หรือ cross-module core logic

### Tier Enforcement Matrix

| Rule | Quick | Standard | Critical |
|---|---|---|---|
| Before Start full preflight | ลดรูป (อ่านเฉพาะไฟล์ที่เกี่ยวข้องโดยตรง) | ใช้แบบย่อ (อ่าน INDEX + ไฟล์งานที่เกี่ยวข้อง) | ใช้เต็มรูปแบบ |
| Evidence-based line-by-line | เฉพาะเมื่อ USER ขอ audit/check เชิงยืนยัน | ใช้กับจุดสำคัญ | ใช้เต็มรูปแบบ |
| Double verification after edit | ใช้เมื่อแก้ไฟล์ logic/config เท่านั้น | ใช้ตามปกติ | ใช้เต็มรูปแบบ |
| Pre-delivery test | อย่างน้อย lint/targeted tests ตาม scope | รัน tests ตาม module ที่ได้รับผลกระทบ | ต้องรัน `npm test` เต็มชุดและต้องผ่าน 100% |

> หมายเหตุ: กฎความปลอดภัยทั้งหมดในหัวข้อ **[SECURITY BOUNDARY — MANDATORY]** ยังคงบังคับใช้ทุก Tier โดยไม่มีข้อยกเว้น

1. **[BEFORE START]** ก่อนเริ่มทำงานทุกครั้ง **ต้องตรวจสอบบทบาท (Role) ของตัวเองใน `docs/standards/roles/` (หากมีการระบุ)** และทำ preflight ตาม Tier:
   - **Quick:** อ่านเฉพาะไฟล์ที่เกี่ยวข้องโดยตรงกับงาน + role doc ที่เกี่ยวข้อง
   - **Standard:** อ่าน `docs/INDEX.md` + ไฟล์มาตรฐาน/งานที่เกี่ยวข้อง + `docs/history/USER_TASKS.md` แบบเฉพาะหัวข้อที่สัมพันธ์
   - **Critical:** ต้องอ่าน `docs/INDEX.md` และ `docs/history/USER_TASKS.md` ครบตามลำดับเดิม

2. **[PRIORITIZE STANDARDS]** ไม่ว่า USER จะใช้คำเรียกใดในระหว่างการสั่งงาน (เช่น "ปิดงาน", "Resolved", "เสร็จสิ้น") **AI ต้องยึดถือชื่อสถานะและ Logic ตามไฟล์มาตรฐาน (อ้างอิงจาก `docs/INDEX.md`) เป็นหลักเสมอ** ห้ามใช้ชื่อสถานะนอกเหนือจากที่กำหนดใน Standard

3. **[ZERO UI HACKS]** ห้าม AI เขียนโค้ดเพื่อดัดแปลงค่าแสดงผลให้ดูเหมือนถูกต้อง (เช่น `status === 'Resolved' ? 'Closed' : status`) หากพบข้อมูลในระบบไม่ตรงตามมาตรฐาน **ห้ามทำการแก้ขัดโดยเด็ดขาด** ให้แจ้ง USER ทันทีและเสนอทำการ Data Migration เพื่อแก้ไขข้อมูลที่ต้นทางให้ถูกต้องตามมาตรฐาน

4. **[CRITICAL LOGIC CONFIRMATION]** หากพบจุดที่มีความกำกวมหรือไม่มั่นใจในเงื่อนไขสำคัญของระบบ (Critical Logic/Workflow) **ต้องหยุดถาม USER พร้อมระบุป้าย `> [!IMPORTANT]`** เพื่อแจ้งเตือนทุกครั้งก่อนลงมือแก้ไข

5. **[DOCUMENTATION SYNC]** หลังจากการสอบถาม USER และได้รับการยืนยันการเพิ่มคำสั่งใหม่หรือเปลี่ยน Logic ใดๆ **ต้องอัปเดตข้อมูลลงในไฟล์ `.md` ที่เกี่ยวข้องทันที** เพื่อให้เอกสารสะท้อนสถานะปัจจุบันของระบบเสมอ

6. **[BEFORE END]** เมื่อจบงานในแต่ละวัน (หรือเมื่อ USER สั่งจบงาน) **ต้องทำการอัปเดตส่วน "Change Logs" ใน `docs/history/CHANGELOG.md`** โดยต้อง **ระบุวันที่และเวลา (Timestamp)** เข้าไปด้วยเสมอ เนื่องจากในหนึ่งวันอาจมีการบันทึกหลายครั้ง

7. **[DOCUMENTATION STRUCTURE]** หากมีการสร้างไฟล์ `.md` ใหม่ **ห้ามสร้างไว้ที่ Root Folder โดยเด็ดขาด** และ AI ต้องจัดหมวดหมู่ไฟล์ให้ถูกต้องตามประเภทงานเสมอ:
   - **Development Standards**: เก็บใน `docs/standards/` (สำหรับกฎและ Logic)
   - **Implementation History**: เก็บใน `docs/history/` (สำหรับบันทึกการทำงาน/Audit)
   - **Manuals & Guides**: เก็บใน `docs/manuals/` (สำหรับคู่มือการใช้งาน)

   และหลังจากสร้างแล้ว **ต้องไปอัปเดตลิงก์ใน `docs/INDEX.md` ตามหมวดหมู่ให้เรียบร้อยเสมอ**

8. **[EVIDENCE-BASED VERIFICATION]** เมื่อ USER ถามหรือสั่งให้ "ตรวจสอบ", "ดูว่า...", "ระบบทำงานถูกต้องไหม" หรือคำสั่งในลักษณะเดียวกัน ให้บังคับตาม Tier:
   - **Quick:** ตอบแบบกระชับจากไฟล์ที่เกี่ยวข้องโดยตรง และใส่ line reference เมื่อเป็นข้อสรุปเชิงยืนยัน
   - **Standard/Critical:** ใช้หลักฐานแบบเต็มตามรายการด้านล่าง
   - **อ่านไฟล์จริง**: ใช้ `view_file` หรือ `grep_search` อ่านโค้ดหรือไฟล์ที่เกี่ยวข้องจริงๆ ก่อนตอบ **ห้ามตอบจากความจำ**
   - **อ้างอิงหลักฐาน**: คำตอบต้องระบุ ชื่อไฟล์ + หมายเลขบรรทัด + โค้ดที่เกี่ยวข้อง เพื่อพิสูจน์คำตอบ เช่น `app/actions/workflow.js:L75 — applySignaturesToWorkflow() ถูกเรียกหลัง generateWorkflowSteps()`
   - **เปรียบเทียบกับมาตรฐาน**: ต้องระบุด้วยว่าโค้ดที่พบ **สอดคล้อง** หรือ **ไม่สอดคล้อง** กับมาตรฐานใน `docs/standards/` โดยอ้างอิง Section ที่เกี่ยวข้อง
   - **ห้ามตอบแบบ "น่าจะ" หรือ "โดยทั่วไป"**: หากไม่แน่ใจให้ระบุว่า "ยังไม่ได้ตรวจสอบโค้ดจริง กำลังดำเนินการ..." แล้วไปอ่านไฟล์ก่อนตอบ
   - **รายงานตามความจริง**: หากพบว่าโค้ดยังไม่เป็นไปตามมาตรฐาน **ต้องรายงานตรงๆ** พร้อมระบุจุดที่ไม่ตรงและเสนอแนวทางแก้ไข ห้ามรายงานว่า "ถูกต้องแล้ว" หากยังไม่ตรวจสอบจริง

9. **[DAILY LOG SHRINKING]** เมื่อ USER แจ้งว่า "เริ่มงานได้" หรือก่อนเริ่มงานในวันใหม่ทุกครั้ง **AI ต้องตรวจสอบวันที่ล่าสุดใน `docs/history/CHANGELOG.md` ทันที** หากวันที่ปัจจุบันไม่ตรงกับวันที่ล่าสุดใน Changelog ต้องทำการย้าย (Archive) บันทึกของวันก่อนหน้าทั้งหมดไปไว้ในไฟล์ `docs/history/archive/CHANGELOG_YYYY_MM_DD.md` ก่อนเริ่มงานหรือก่อนบันทึกงานใหม่ เพื่อรักษาขนาดไฟล์ `CHANGELOG.md` ให้กะทัดรัดและทำงานได้รวดเร็วเสมอ

10. **[DOUBLE-VERIFICATION BEFORE CONFIRMATION]** ห้ามตอบ USER ว่า "อัปเดตแล้ว", "แก้ไขแล้ว" หรือ "บันทึกแล้ว" จนกว่าจะได้ทำการ **ตรวจสอบไฟล์จริง** (View File) อีกครั้งหลังจากส่งคำสั่งแก้ไข โดยใช้ตาม Tier:
   - **Quick:** บังคับเมื่อแก้ไฟล์ที่มีผลต่อ logic/config/security หรือไฟล์ที่ USER ระบุให้ตรวจละเอียด
   - **Standard/Critical:** บังคับทุกครั้งตามกฎเดิม

11. **[NON-INTUITIVE DETAILED PLANNING]** ในการทำ Implementation Plan ห้ามใช้ "ความรู้สึก" หรือ "ความน่าจะเป็น" ในการกำหนด Logic หากจุดใดมีความซับซ้อน **ต้องระบุเป็น Technical Logic/Pseudocode** ให้ละเอียดถึงระดับฟิลด์ข้อมูลและเงื่อนไข (If/Else) เพื่อป้องกัน Agent อื่นๆ ตีความผิดพลาด

12. **[VISUAL EVIDENCE ANALYSIS]** เมื่อ USER ส่งรูปภาพ (Screenshot) มาเพื่อแจ้งปัญหาการแสดงผล (UI/UX) หรือ Error **AI ต้องวิเคราะห์จากภาพจริงที่เห็นเป็นลำดับแรก** ห้ามตอบว่า "สวยแล้ว" หรือ "แก้ไขแล้ว" โดยดูเพียงแค่โค้ดหากภาพจริงยังแสดงความผิดพลาดหรือความไม่สวยงาม AI ต้องยอมรับความจริงตามภาพหลักฐานและดำเนินการแก้ไขจนกว่าผลลัพธ์ในภาพจะถูกต้อง 100%

13. **[MODULE BOUNDARY]** ทุกครั้งที่ทำงาน Agent ต้องระบุให้ชัดว่างานนั้นอยู่ใน module ใด และต้องทำงานภายใน boundary ของ module นั้นเท่านั้น:

    | Module | Scope | Actions file | DB Tables หลัก |
    |---|---|---|---|
    | **Incident** | รับแจ้ง → มอบหมาย → แก้ไข → ปิด | `app/actions/incidents.js` | `incidents`, `document_approvals` |
    | **IT Checklist** | Daily/Weekly/Monthly/Yearly | `app/actions/checklist.js` | `checklist_sessions`, `checklist_items`, `checklist_templates` |
    | **SLA** | คำนวณ working time, breached | `lib/slaUtils.js` | อ้างอิง `working_hours`, `holidays` |
    | **Setup** | Working day, Holiday, Approval workflow, Account, Checklist master/template, Logs | `app/actions/setup.js` | `holidays`, `working_hours`, `user_profiles`, `user_whitelist` |

    **ห้าม** แก้ไขไฟล์ของ module อื่นโดยไม่ได้รับคำสั่งชัดเจนจาก USER

14. **[DATABASE CONTRACT]** ห้ามสร้างตารางใหม่ในฐานข้อมูลโดยไม่ได้รับการอนุมัติจาก USER ก่อนทุกครั้ง หากต้องการตารางใหม่ให้:
    1. แจ้ง USER พร้อม schema ที่เสนอ
    2. รอ USER อนุมัติ
    3. สร้าง migration file ใน `supabase/migrations/` เท่านั้น ห้ามรัน SQL ตรงกับ production โดยไม่มี migration

15. **[SECURITY BOUNDARY — MANDATORY]** กฎความปลอดภัยต่อไปนี้มีผลบังคับใช้ทุกครั้งโดยไม่มีข้อยกเว้น:
    - **ห้ามใช้ `service_role` key ใน client-side** หรือใน Server Component ที่ไม่จำเป็น
    - **ห้ามเขียน Logic ที่ bypass RLS** ของ Supabase ไม่ว่ากรณีใดก็ตาม
    - **ห้ามแก้ไข PIN System** (6-digit Bcrypt) โดยไม่ผ่านการ review จาก USER — ให้ escalate ทันที
    - **ห้ามเปลี่ยน RBAC Role** (`admin`, `it_staff`, `approver`, `employee`, `auditor`) หรือสิทธิ์ของแต่ละ Role โดยไม่มีคำสั่งชัดเจน
    - **ทุก Server Action ที่เกี่ยวกับ approval ต้องผ่าน `workflow.js`** ห้ามเขียน approval logic ใหม่แยกต่างหาก

---

# Project Agent Rules

## Stack
- Next.js 15 App Router (ห้ามใช้ Pages Router เด็ดขาด)
- Tailwind CSS v4
- Supabase (ใช้ SSR client เสมอ ห้ามใช้ browser client ใน Server Component)
- TypeScript strict mode — ห้ามใช้ `any` โดยไม่มีเหตุผล ให้ใช้ generated types จาก `supabase_types.ts`

## Folder & File Convention

```
app/
  actions/          ← Business logic ทั้งหมด (Server Actions)
  dashboard/        ← Pages ที่ต้องล็อกอิน
  api/              ← Route Handlers (QR lookup ฯลฯ)
  auth/             ← Authentication pages
components/
  workflow/         ← Shared workflow UI (modal, progress bar)
lib/
  slaUtils.js       ← SLA calculation
  noSeries.js       ← Document number generation
  supabaseServer.js ← Server-side Supabase client
docs/
  standards/        ← กฎและ Logic สำหรับ Agent
  history/          ← Changelog และ Task history
  manuals/          ← คู่มือผู้ใช้และ UAT
supabase/
  migrations/       ← SQL migrations เท่านั้น
ai-tasks/
  SCAN_SUMMARY.md
  tasks/            ← Task files สำหรับ multi-model workflow
```

**Naming Convention:**
- Server Actions: `verbNoun` (เช่น `createIncident`, `resolveIncident`, `approveChecklist`)
- Pages: `app/dashboard/[module]/[sub-path]/page.js`
- Components: `PascalCase.js`
- DB columns: `snake_case`

## การเขียนโค้ด
- Component ทุกตัวต้องระบุ `"use client"` หรือ `"use server"` ให้ชัดเจน
- ห้าม fetch ข้อมูลใน Client Component โดยตรง ให้ผ่าน Server Action หรือ Route Handler เท่านั้น
- ใช้ `cn()` จาก clsx/tailwind-merge ทุกครั้งที่ต่อ className
- ก่อนแก้ไฟล์ ให้อ่านไฟล์นั้นก่อนเสมอ (ห้าม assume เนื้อหา)
- แก้ทีละ task ให้เสร็จก่อน ห้ามกระโดดข้าม task

## Supabase / Database
- ตรวจ RLS policy ก่อน query ทุกครั้ง
- ใช้ generated types จาก `supabase_types.ts` เสมอ ห้ามใช้ `any`
- ห้ามเปิด `service_role` key ใน client-side (ดูเพิ่มเติมใน SECURITY BOUNDARY)
- Migration ทุกอันต้องบันทึกใน `supabase/migrations/` เท่านั้น
## การทำงานของ Agent
- **[DEV SERVER SAFETY]** เมื่อ USER สั่งให้รัน `localhost` หรือ `npm run dev` ให้ตรวจสอบ port 3000 ก่อนด้วย `netstat -ano | findstr :3000` และปิดเฉพาะ process ที่ใช้ port นั้น (`taskkill /F /PID <PID>`) แทนการ kill node.exe ทั้งหมด เพื่อป้องกัน process อื่นที่ไม่เกี่ยวข้องถูกปิดไปด้วย
- **[PRE-DELIVERY TEST]** ก่อนส่งงานทุกครั้ง (หรือก่อนตอบ "เสร็จแล้ว") ให้รันการทดสอบตาม Tier:
  - **Quick:** อย่างน้อย `npm run lint` หรือ targeted tests ตาม scope
  - **Standard:** รัน tests เฉพาะ module/feature ที่ได้รับผลกระทบ และเพิ่ม lint
  - **Critical:** ต้องรันคำสั่ง `npm test` เต็มชุดและต้องผ่าน 100% หากมีข้อผิดพลาดต้องแก้ไขให้ผ่านก่อนส่งงาน
- ใช้ Context7 ทุกครั้งที่ต้องการ docs ของ library ภายนอก
- **[CLOUD SYNC FLOW]** เมื่อมีการผสานโค้ดจาก Cloud AI (เช่น Google Jules) กลับมาที่กิ่งหลัก `main` บน GitHub:
  - Agent ต้องแจ้ง USER และเสนอช่วยดึงโค้ดล่าสุดกลับลงมาอัปเดตเครื่อง Localhost ด้วยคำสั่ง `git pull origin main` ทันทีเพื่อรักษาสภาพแวดล้อมให้ตรงกัน 100%
  - ห้ามเขียนทับโค้ดบนเครื่อง Localhost ด้วยมือโดยไม่มีการทำ Git Pull หรือ Git Merge อย่างถูกต้องเด็ดขาด
- **[PARALLEL CONFLICT RESOLUTION]** ในกรณีที่เครื่อง Localhost มีการแก้ไขฟีเจอร์ในขณะที่ Cloud AI ก็ทำการแก้ไขในจุดเดียวกัน (ทำให้เกิด Merge Conflict):
  - Agent ต้องหยุดและรายงานจุดที่โค้ดชนกันแก่ USER ทันที (ห้ามเดาสุ่มเลือกเวอร์ชันใดเวอร์ชันหนึ่งหรือกดลบโค้ดของอีกฝั่งทิ้ง)
  - Agent ต้องเสนอทำหน้าที่ "ผู้ประสานรวมร่างโค้ด (Conflict Resolver)" โดยการเปิดไฟล์ที่ขัดแย้ง อ่านตรรกะทั้งสองฝั่ง (Local Dev & Cloud AI) และเขียนผสาน Logic เข้าด้วยกันอย่างลงตัวโดยไม่สูญเสียความสามารถเดิมและประสิทธิภาพใหม่
  - ต้องทำการรันคำสั่งทดสอบระบบ `npm test` เพื่อตรวจสอบการทำงานร่วมกันทุกครั้งหลังจากแก้ไขความขัดแย้งเสร็จสิ้น และห้ามรายงานว่า "สำเร็จ" จนกว่าผลการเทสจะเป็น Pass 100%


---

# AI Multi-Model Workflow Control

ใช้กฎชุดนี้เมื่อ USER ต้องการให้ตรวจสอบ/แก้ไขระบบแบบแยกบทบาทระหว่าง AI วางแผนกับ AI ลงมือแก้ เช่น เมื่อ USER เรียกคำสั่ง `SmartAi`, `FastAi`, ระบุ `Task file`, สั่งให้ส่งงานต่อให้ agent ตัวเล็ก หรืออ้างอิง workflow แบบ `SCAN_SUMMARY.md`

## Role Definition

### Smart AI
**หน้าที่:** คิด วิเคราะห์ วางแผน สร้าง Task files Debug งานยาก และตัดสินใจเชิงสถาปัตยกรรม  
**ห้าม:** แก้โค้ดโดยตรงโดยไม่มี Task file ใน workflow นี้ หรือทำงาน execution ที่ Fast AI ทำได้

### Fast AI
**หน้าที่:** Scan codebase, Execute Task files, Self-validate, Report ผล  
**ห้าม:** วิเคราะห์หรือวางแผนนอก scope ที่กำหนดใน Task file หรือตัดสินใจเปลี่ยน logic สำคัญเอง

## กฎข้อที่ 1: รายงานตัวก่อนเริ่ม workflow

เมื่อ USER เรียก workflow นี้ AI ต้องรายงานตัวก่อนทำงานในรูปแบบ:

```text
รายงานตัว
Model    : [ชื่อ Model จริง เช่น Gemini 2.0 Flash / GPT-5]
Role     : [Smart AI / Fast AI]
Task     : [ชื่อ Task ที่จะทำ เช่น Checklist_Template_Builder_001 / SCAN_SUMMARY]
Step     : [Step ที่เท่าไหร่ของ Workflow เช่น Step 1/7]
Input    : [ไฟล์หรือข้อมูลที่รับมา เช่น SCAN_SUMMARY.md]
Output   : [ไฟล์หรือผลที่จะส่งออก เช่น Checklist_Template_Builder_001.md]

รอ Human Confirm ก่อนเริ่ม
```

AI ต้องหยุดรอจนกว่า Human จะพิมพ์ `ยืนยัน`, `confirm`, หรือ `ok` ก่อนเริ่ม step นั้น หาก Human แจ้งว่า Model/Role ผิด ให้หยุดทำงานและแจ้งให้ Human เปลี่ยน Model/Role ก่อน

## กฎข้อที่ 2: Confirm ก่อนขึ้น Step ถัดไป

เมื่อจบแต่ละ Step ใน workflow นี้ AI ต้องรายงานผลและถามยืนยันในรูปแบบ:

```text
Step [N] เสร็จสิ้น
─────────────────────────────
Output ที่ส่งมอบ : [ชื่อไฟล์หรือผลลัพธ์]
Status           : Pass / Fail / Escalate

─────────────────────────────
Step ถัดไป
Step     : [Step N+1]
Task     : [ชื่องานที่จะทำ]
Model    : [Smart AI / Fast AI]
Input    : [ไฟล์ที่ต้องใช้]

พิมพ์ "ต่อ" เพื่อเริ่ม Step ถัดไป หรือแจ้งถ้าต้องการปรับเปลี่ยน
```

AI ต้องหยุดรอทุกครั้ง ห้าม proceed Step ถัดไปเองโดยไม่ได้รับอนุญาต

## กฎข้อที่ 3: Handoff Checklist ก่อนสลับ Model

เมื่อจะสลับจาก Smart AI ไป Fast AI หรือ Fast AI ไป Smart AI ต้องทำ Handoff ก่อนหยุด:

```text
HANDOFF REPORT
─────────────────────────────
จาก     : [Smart AI / Fast AI]
ไปยัง   : [Smart AI / Fast AI]
Step    : [Step ที่เพิ่งเสร็จ] → [Step ที่จะเริ่ม]

Output ที่ส่งมอบ:
  - [ชื่อไฟล์ที่สร้าง/แก้]

Context ที่ Model ถัดไปต้องรู้:
  - [สิ่งสำคัญที่พบระหว่างทำงาน]
  - [ข้อควรระวังหรือ constraint พิเศษ]

ไฟล์ที่ Model ถัดไปต้องอ่าน:
  - [ชื่อไฟล์ + path]

─────────────────────────────
Human ระบุ Step และไฟล์ให้ Model ถัดไปได้เลย
```

## กฎข้อที่ 4: Escalate ทันทีเมื่อเจอ blocker

Fast AI ต้องหยุดและ Escalate ทุกครั้งเมื่อเจอเงื่อนไขต่อไปนี้:

- ไม่รู้ว่าต้องแก้ไฟล์ไหน
- Checklist ผ่านไม่ได้หลัง retry 2 ครั้ง
- พบ side effect นอก scope
- Task file มีข้อมูลขัดแย้งกัน
- ต้องแก้ schema, env หรือ config
- ต้องแก้ไข Security Boundary (PIN, RLS, RBAC, approval logic)
- ต้องเปลี่ยน critical workflow/permission ที่ Task file ไม่ได้ระบุไว้ชัดเจน

Format:

```text
ESCALATE — [TASK-ID]
─────────────────────────────
Reason      : [สาเหตุ]
Attempted   : [ลองทำอะไรไปแล้ว]
Blocker     : [ติดอะไรอยู่]
Suggestion  : [ความเห็นของ Fast AI ถ้ามี]
─────────────────────────────
รอ Human ตัดสินใจ
```

## Workflow มาตรฐาน

```text
Step 1  Fast AI     Scan & Summarize codebase
                    Output → SCAN_SUMMARY.md
                    Human Checkpoint

Step 2  Smart AI    รับ SCAN_SUMMARY.md + Requirements
                    Output → Task files (เช่น Checklist_Template_Builder_001.md)
                    Human Checkpoint

Step 3  Fast AI     Execute TASK ทีละ file + Self-validate
                    Output → Execution Report ใน TASK file
                    Human Checkpoint

Step 4  Fast AI     รายงานผล pass/fail ทุก Task
                    Human Checkpoint

Step 5  Smart AI    ถ้า fail เกิน 2 ครั้ง ให้ Debug เฉพาะ Task นั้น
                    Output → TASK-XXX-fix.md
                    Human Checkpoint

Step 6  Human       Review โค้ด + Test + Merge to main
```

## วิธีเรียกใช้งาน

เรียก Fast AI:

```text
FastAi
Step   : [Step ที่เท่าไหร่]
Input  : [ไฟล์ที่ต้องอ่าน เช่น Checklist_Template_Builder_001.md]
Task   : [อธิบายสั้นๆ ว่าทำอะไร]
```

เรียก Smart AI:

```text
SmartAi
Step   : [Step ที่เท่าไหร่]
Input  : [ไฟล์ที่ต้องอ่าน เช่น SCAN_SUMMARY.md]
Task   : [อธิบายสั้นๆ ว่าทำอะไร]
```

## คำสั่ง Human ที่ต้องรู้จัก

| Human พิมพ์ | AI ต้องทำ |
|------------|----------|
| `ยืนยัน` / `confirm` / `ok` | เริ่มทำงานได้ |
| `ต่อ` | เริ่ม Step ถัดไปได้ |
| `หยุด` / `stop` | หยุดทันที รอคำสั่งใหม่ |
| `ยกเลิก` / `cancel` | ยกเลิก Task ปัจจุบัน อัปเดต status เป็น Cancelled |
| `รายงาน` | สรุปสถานะทุก Task ในรูปแบบ Session Summary |
| `retry` | ลองทำ Task ปัจจุบันใหม่อีกครั้ง และนับ retry count |

## โครงสร้างไฟล์มาตรฐานสำหรับ Workflow นี้

```text
ai-tasks/
  SCAN_SUMMARY.md
  tasks/
    Checklist_Template_Builder_001.md
    QR_Scan_Navigation_002.md
    [WORK_NAME]_XXX.md
```

หมายเหตุ: กฎ `DOCUMENTATION STRUCTURE` ของโปรเจกต์ยังมีผลเสมอ หากไฟล์เป็นมาตรฐาน แผนงาน หรือคู่มือถาวร ต้องเก็บใน `docs/standards/`, `docs/history/`, หรือ `docs/manuals/` ตามประเภท และอัปเดต `docs/INDEX.md`

## Session Summary Format

เมื่อ Human พิมพ์ `รายงาน` ใน workflow นี้ AI ต้องสรุปในรูปแบบ:

```text
SESSION SUMMARY
─────────────────────────────────────────
| Task                                  | Model    | Status    |
|---------------------------------------|----------|-----------|
| Checklist_Template_Builder_001        | Fast AI  | Pass      |
| QR_Scan_Navigation_002                | Fast AI  | Cancelled |
| Photo_Evidence_Geolocation_003        | Fast AI  | Escalate  |
─────────────────────────────────────────
Files Changed : [รายชื่อไฟล์ที่ถูกแก้]
Pending       : [Task ที่ยังค้างอยู่]
Next Step     : [Step ถัดไปที่ควรทำ]
```

---

# 🕵️ Project Audit / Project Checker Role

เมื่อ USER สั่งให้ AI ทำหน้าที่เป็น **Project Checker** หรือ **Auditor** ให้ปฏิบัติตามมาตรฐานดังนี้:

1. **[CORE DUTY]** หน้าที่หลักคือการตรวจสอบ (Audit) ความสอดคล้องระหว่าง **"โค้ดจริง (Source Code)"** กับ **"เอกสารมาตรฐาน (Standards)"** ใน `docs/standards/`

2. **[GAP IDENTIFICATION]** หากพบฟังก์ชันในโค้ดที่ทำงานได้จริงแต่ยังไม่มีในเอกสารมาตรฐาน **ต้องทำการอัปเดตเอกสารมาตรฐานทันที** เพื่อให้เอกสารเป็น Source of Truth ที่สมบูรณ์

3. **[DOCUMENTATION AUDIT]** ตรวจสอบว่ามีเอกสารครบทั้ง 3 ประเภทหลักหรือไม่:
   - **Development Standards**: มาตรฐานการพัฒนาระบบ (สำหรับ Agent)
   - **Implementation History**: บันทึกการดำเนินการและประวัติการเปลี่ยนแปลง (สำหรับ Audit)
   - **Manuals & Guides**: คู่มือการใช้งานและขั้นตอนการทำงาน (สำหรับ User/Developer)

4. **[REPORTING STANDARD]** การรายงานผลต้องใช้หลักการ **Evidence-Based** (อ้างอิงไฟล์และหมายเลขบรรทัด) และต้องระบุสถานะความถูกต้องตามความเป็นจริงเสมอ (ห้าม UI Hacks หรือตอบแบบคาดเดา)
