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

### Scan Scope Matrix

| Mode | Quick | Standard | Critical |
|---|---|---|---|
| Fast AI | อ่านเฉพาะไฟล์ที่อยู่ใน Task file และ dependency ตรงเท่านั้น | อ่านเพิ่มได้เฉพาะไฟล์ที่ถูกอ้างอิงจาก call chain | ห้าม scan ทั้ง repo เอง ต้องได้รับอนุมัติจาก Human ก่อน |
| Smart AI | วางแผนจากเอกสารที่เกี่ยวข้อง | ออกแบบ task และ boundary | ทำ full architecture review ได้เมื่อ Human ระบุชัด |

## Superpowers Trigger Matrix

| Work Type | Mandatory Skill |
|---|---|
| New feature หรือ refactor | `brainstorming` + `writing-plans` |
| Implementation ตามแผน | `executing-plans` |
| Bug investigation | `systematic-debugging` |
| ก่อนส่งมอบ | `verification-before-completion` |
| งานที่มี test impact | `test-driven-development` |

## 🎛️ Superpowers Workflow Catalog (Thai Quick Guide)

เมื่อ AI ต้องให้ USER เลือก workflow ให้แสดงรายการต่อไปนี้พร้อมคำอธิบายไทยแบบสั้น:

| Workflow | ใช้เมื่อ | คำอธิบายสั้น (TH) |
|---|---|---|
| `brainstorming` | Requirement ยังไม่ชัด / ต้องแตกโจทย์ | ช่วยตั้งคำถามทีละข้อ สรุปโจทย์ให้ชัดก่อนเริ่ม |
| `writing-plans` | มีโจทย์แล้ว ต้องทำแผน | แปลงโจทย์เป็นแผนลงมือทำแบบ step-by-step |
| `executing-plans` | มีแผนที่อนุมัติแล้ว | ลงมือทำตามแผนทีละขั้น พร้อม checkpoints |
| `verification-before-completion` | ก่อนส่งงานทุกครั้ง | ตรวจความถูกต้องสุดท้าย + ยืนยันความพร้อมส่งมอบ |
| `test-driven-development` | งานมีผลกับ test/logic | เขียนเทสต์นำก่อน แล้วค่อยแก้โค้ดเพื่อให้เทสต์ผ่าน |
| `systematic-debugging` | พบ bug/อาการผิดปกติ | หา root cause แบบเป็นระบบ ห้ามเดาสุ่มแก้ |
| `subagent-driven-development` | งานใหญ่หลายส่วน | แบ่งงานให้ agent ย่อยแบบมี quality gates |
| `dispatching-parallel-agents` | งานแยกทำขนานได้ | จัดการหลายงานพร้อมกัน ลดเวลาโดยไม่เสียการควบคุม |
| `requesting-code-review` | ต้องส่งรีวิว | เตรียม context และ checklist ให้รีวิวได้เร็ว |
| `receiving-code-review` | ได้ feedback กลับมา | รับ/จัดลำดับ feedback และแก้อย่างเป็นระบบ |
| `using-git-worktrees` | ต้องแยกสภาพแวดล้อม | แยก branch workspace เพื่อลดการชนกันของงาน |
| `finishing-a-development-branch` | ก่อนปิดงาน/รวมโค้ด | เก็บงานให้สะอาดพร้อม merge |
| `using-superpowers` | ต้องอธิบายการใช้งานคลังทักษะ | เลือก skill ให้ตรงงานและเรียงลำดับการใช้ |
| `writing-skills` | ต้องสร้าง/ปรับปรุง skill เอง | เขียนหรือยกระดับเอกสาร skill มาตรฐาน |

## 🧭 Ambiguous Prompt Router (Mandatory)

เมื่อ USER ส่งคำสั่งคลุมเครือ (เช่น "เช็ก checklist", "workflow ผิด", "UI ติดกัน") AI **ต้องหยุด** และส่ง prompt เลือก workflow ก่อนเสมอ โดยใช้ฟอร์แมตนี้:

```text
> [!IMPORTANT]
คำสั่งยังไม่ชัดเจนพอสำหรับการลงมือทำทันที

เลือก Workflow ที่ต้องการ:
1) brainstorming — ช่วยแตกโจทย์และเก็บ requirement ให้ชัด
2) systematic-debugging — สืบหาสาเหตุ bug แบบเป็นระบบ
3) writing-plans — สร้างแผน implementation ก่อนลงมือ
4) executing-plans — ลงมือทำตามแผนที่อนุมัติแล้ว
5) verification-before-completion — ตรวจความถูกต้องก่อนปิดงาน

ตอบกลับเป็นเลขข้อ + ขอบเขตที่ต้องการ (module/path)
```

กฎบังคับ:
- ห้ามข้ามขั้น Router เมื่อ requirement ยังไม่ชัด
- หาก USER ไม่เลือก workflow ให้ default เป็น `brainstorming`
- หลังเลือก workflow แล้วค่อยดำเนินการตามลำดับ Superpowers lifecycle

## 🧪 Model Suitability Check (Mandatory)

ก่อนเริ่มงานทุก prompt AI ต้องประเมินความเหมาะสมของ model ปัจจุบันเทียบกับประเภทงานเสมอ

เกณฑ์บังคับ:
- หากงานเป็น **Critical**, งาน **debug ซับซ้อน**, งาน **ข้ามหลาย module**, หรือมี **security boundary impact** ให้ประเมินเป็นงานความเสี่ยงสูง
- หาก model ปัจจุบันไม่เหมาะกับงานความเสี่ยงสูง AI **ต้องหยุดก่อนลงมือ** และแจ้ง USER ให้ยืนยัน
- ห้าม execute ต่อจนกว่า USER จะยืนยันเลือก “ใช้ model เดิม” หรือ “สลับ model”

ฟอร์แมตแจ้งเตือนบังคับ:

```text
> [!IMPORTANT]
Model Suitability Alert

งานนี้มีความเสี่ยงระดับ: [Quick/Standard/Critical]
Model ปัจจุบัน: [model-name]
เหตุผลความเสี่ยง: [สั้น กระชับตามหลักฐาน]

ตัวเลือก:
1) ยืนยันใช้ model ปัจจุบันต่อ
2) สลับไป model ที่เหมาะกว่า แล้วค่อยดำเนินการ

ตอบกลับเป็นเลขข้อ
```

Model Mapping (Default Policy):
- **Quick:** fast model ได้
- **Standard:** balanced/coding model
- **Critical/Complex Debug/Security:** reasoning-capable model ระดับสูง

> หมายเหตุ: กฎความปลอดภัยทั้งหมดในหัวข้อ **[SECURITY BOUNDARY — MANDATORY]** ยังคงบังคับใช้ทุก Tier โดยไม่มีข้อยกเว้น

1. **[BEFORE START]** ก่อนเริ่มทำงานทุกครั้ง **ต้องตรวจสอบบทบาท (Role) ของตัวเองใน `docs/standards/roles/` (หากมีการระบุ)** และทำ preflight ตาม Tier:
   - **Quick:** อ่านเฉพาะไฟล์ที่เกี่ยวข้องโดยตรงกับงาน + role doc ที่เกี่ยวข้อง
     - Fast AI: ห้ามเปิดไฟล์นอก Task scope ยกเว้น import chain ที่จำเป็น
   - **Standard:** อ่าน `docs/INDEX.md` + ไฟล์มาตรฐาน/งานที่เกี่ยวข้อง + `docs/history/USER_TASKS.md` แบบเฉพาะหัวข้อที่สัมพันธ์
     - Fast AI: ต้องยึด input file list จาก Task file เป็นหลัก
   - **Critical:** ต้องอ่าน `docs/INDEX.md` และ `docs/history/USER_TASKS.md` ครบตามลำดับเดิม
     - Fast AI: ต้องรายงานเหตุผลก่อนขยาย scope การอ่านทุกครั้ง

   หมายเหตุการ reconcile:
   - Quick tier: อนุญาตอ่านเฉพาะ section ที่เกี่ยวข้องใน `docs/history/USER_TASKS.md` แทนการอ่านทั้งไฟล์
   - Standard/Critical: ปฏิบัติตามกฎเดิมเต็มรูปแบบ

2. **[PRIORITIZE STANDARDS]** ไม่ว่า USER จะใช้คำเรียกใดในระหว่างการสั่งงาน (เช่น "ปิดงาน", "Resolved", "เสร็จสิ้น") **AI ต้องยึดถือชื่อสถานะและ Logic ตามไฟล์มาตรฐาน (อ้างอิงจาก `docs/INDEX.md`) เป็นหลักเสมอ** ห้ามใช้ชื่อสถานะนอกเหนือจากที่กำหนดใน Standard

3. **[ZERO UI HACKS]** ห้าม AI เขียนโค้ดเพื่อดัดแปลงค่าแสดงผลให้ดูเหมือนถูกต้อง (เช่น `status === 'Resolved' ? 'Closed' : status`) หากพบข้อมูลในระบบไม่ตรงตามมาตรฐาน **ห้ามทำการแก้ขัดโดยเด็ดขาด** ให้แจ้ง USER ทันทีและเสนอทำการ Data Migration เพื่อแก้ไขข้อมูลที่ต้นทางให้ถูกต้องตามมาตรฐาน

4. **[CRITICAL LOGIC CONFIRMATION]** หากพบจุดที่มีความกำกวมหรือไม่มั่นใจในเงื่อนไขสำคัญของระบบ (Critical Logic/Workflow) หรือคำสั่งจาก USER มีรายละเอียดไม่เพียงพอ (Vague Requirements) **ต้องหยุดถาม USER ทันที** พร้อมระบุป้าย `> [!IMPORTANT]` และใช้ความสามารถจาก `brainstorming` เพื่อช่วย USER ขยายความต้องการให้ชัดเจนก่อนลงมือแก้ไข

5. **[SUPERPOWERS-FIRST MANDATE]** AI Agents ทุกตัวต้องใช้แนวปฏิบัติจาก [SUPERPOWERS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SUPERPOWERS.md) เป็นแนวทางหลักในการทำงาน โดย Superpowers มี priority รองจากคำสั่งโดยตรงของ USER เสมอ:
   - ทุกคำสั่ง "ตรวจสอบ" หรือ "แก้ไข" ต้องเข้าสู่ workflow: `brainstorming` → `writing-plans` → `executing-plans` → `verification-before-completion`
   - ห้ามลงมือแก้ไขทันทีหากยังไม่มี "แผนการทำงาน" (Implementation Plan) ที่ USER อนุมัติแล้ว
   - หากไม่มั่นใจว่าคำสั่งนั้นเข้าข่าย Skill ใด ให้ใช้ `brainstorming` เพื่อจัดกลุ่มงานก่อนเสมอ

6. **[DOCUMENTATION SYNC]** หลังจากการสอบถาม USER และได้รับการยืนยันการเพิ่มคำสั่งใหม่หรือเปลี่ยน Logic ใดๆ **ต้องอัปเดตข้อมูลลงในไฟล์ `.md` ที่เกี่ยวข้องทันที** เพื่อให้เอกสารสะท้อนสถานะปัจจุบันของระบบเสมอ

7. **[BEFORE END]** เมื่อจบงานในแต่ละวัน (หรือเมื่อ USER สั่งจบงาน) **ต้องทำการอัปเดตส่วน "Change Logs" ใน `docs/history/CHANGELOG.md`** โดยต้อง **ระบุวันที่และเวลา (Timestamp)** เข้าไปด้วยเสมอ เนื่องจากในหนึ่งวันอาจมีการบันทึกหลายครั้ง

8. **[DOCUMENTATION STRUCTURE]** หากมีการสร้างไฟล์ `.md` ใหม่ **ห้ามสร้างไว้ที่ Root Folder โดยเด็ดขาด** และ AI ต้องจัดหมวดหมู่ไฟล์ให้ถูกต้องตามประเภทงานเสมอ:
   - **Development Standards**: เก็บใน `docs/standards/` (สำหรับกฎและ Logic)
   - **Implementation History**: เก็บใน `docs/history/` (สำหรับบันทึกการทำงาน/Audit)
   - **Manuals & Guides**: เก็บใน `docs/manuals/` (สำหรับคู่มือการใช้งาน)

   และหลังจากสร้างแล้ว **ต้องไปอัปเดตลิงก์ใน `docs/INDEX.md` ตามหมวดหมู่ให้เรียบร้อยเสมอ**

9. **[EVIDENCE-BASED VERIFICATION]** เมื่อ USER ถามหรือสั่งให้ "ตรวจสอบ", "ดูว่า...", "ระบบทำงานถูกต้องไหม" หรือคำสั่งในลักษณะเดียวกัน ให้บังคับตาม Tier:
   - **Quick:** ตอบแบบกระชับจากไฟล์ที่เกี่ยวข้องโดยตรง และใส่ line reference เมื่อเป็นข้อสรุปเชิงยืนยัน
   - **Standard/Critical:** ใช้หลักฐานแบบเต็มตามรายการด้านล่าง
   - **อ่านไฟล์จริง**: ใช้ `view_file` หรือ `grep_search` อ่านโค้ดหรือไฟล์ที่เกี่ยวข้องจริงๆ ก่อนตอบ **ห้ามตอบจากความจำ**
   - **อ้างอิงหลักฐาน**: คำตอบต้องระบุ ชื่อไฟล์ + หมายเลขบรรทัด + โค้ดที่เกี่ยวข้อง เพื่อพิสูจน์คำตอบ เช่น `app/actions/workflow.js:L75 — applySignaturesToWorkflow() ถูกเรียกหลัง generateWorkflowSteps()`
   - **เปรียบเทียบกับมาตรฐาน**: ต้องระบุด้วยว่าโค้ดที่พบ **สอดคล้อง** หรือ **ไม่สอดคล้อง** กับมาตรฐานใน `docs/standards/` โดยอ้างอิง Section ที่เกี่ยวข้อง
   - **ห้ามตอบแบบ "น่าจะ" หรือ "โดยทั่วไป"**: หากไม่แน่ใจให้ระบุว่า "ยังไม่ได้ตรวจสอบโค้ดจริง กำลังดำเนินการ..." แล้วไปอ่านไฟล์ก่อนตอบ
   - **รายงานตามความจริง**: หากพบว่าโค้ดยังไม่เป็นไปตามมาตรฐาน **ต้องรายงานตรงๆ** พร้อมระบุจุดที่ไม่ตรงและเสนอแนวทางแก้ไข ห้ามรายงานว่า "ถูกต้องแล้ว" หากยังไม่ตรวจสอบจริง

10. **[DAILY LOG SHRINKING]** เมื่อ USER แจ้งว่า "เริ่มงานได้" หรือก่อนเริ่มงานในวันใหม่ทุกครั้ง **AI ต้องตรวจสอบวันที่ล่าสุดใน `docs/history/CHANGELOG.md` ทันที** หากวันที่ปัจจุบันไม่ตรงกับวันที่ล่าสุดใน Changelog ต้องทำการย้าย (Archive) บันทึกของวันก่อนหน้าทั้งหมดไปไว้ในไฟล์ `docs/history/archive/CHANGELOG_YYYY_MM_DD.md` ก่อนเริ่มงานหรือก่อนบันทึกงานใหม่ เพื่อรักษาขนาดไฟล์ `CHANGELOG.md` ให้กะทัดรัดและทำงานได้รวดเร็วเสมอ

11. **[DOUBLE-VERIFICATION BEFORE CONFIRMATION]** ห้ามตอบ USER ว่า "อัปเดตแล้ว", "แก้ไขแล้ว" หรือ "บันทึกแล้ว" จนกว่าจะได้ทำการ **ตรวจสอบไฟล์จริง** (View File) อีกครั้งหลังจากส่งคำสั่งแก้ไข โดยใช้ตาม Tier:
   - **Quick:** บังคับเมื่อแก้ไฟล์ที่มีผลต่อ logic/config/security หรือไฟล์ที่ USER ระบุให้ตรวจละเอียด
   - **Standard/Critical:** บังคับทุกครั้งตามกฎเดิม

12. **[NON-INTUITIVE DETAILED PLANNING]** ในการทำ Implementation Plan ห้ามใช้ "ความรู้สึก" หรือ "ความน่าจะเป็น" ในการกำหนด Logic หากจุดใดมีความซับซ้อน **ต้องระบุเป็น Technical Logic/Pseudocode** ให้ละเอียดถึงระดับฟิลด์ข้อมูลและเงื่อนไข (If/Else) เพื่อป้องกัน Agent อื่นๆ ตีความผิดพลาด

13. **[VISUAL EVIDENCE ANALYSIS]** เมื่อ USER ส่งรูปภาพ (Screenshot) มาเพื่อแจ้งปัญหาการแสดงผล (UI/UX) หรือ Error **AI ต้องวิเคราะห์จากภาพจริงที่เห็นเป็นลำดับแรก** ห้ามตอบว่า "สวยแล้ว" หรือ "แก้ไขแล้ว" โดยดูเพียงแค่โค้ดหากภาพจริงยังแสดงความผิดพลาดหรือความไม่สวยงาม AI ต้องยอมรับความจริงตามภาพหลักฐานและดำเนินการแก้ไขจนกว่าผลลัพธ์ในภาพจะถูกต้อง 100%

14. **[MODULE BOUNDARY]** ทุกครั้งที่ทำงาน Agent ต้องระบุให้ชัดว่างานนั้นอยู่ใน module ใด และต้องทำงานภายใน boundary ของ module นั้นเท่านั้น:

    | Module | Scope | Actions file | DB Tables หลัก |
    |---|---|---|---|
    | **Incident** | รับแจ้ง → มอบหมาย → แก้ไข → ปิด | `app/actions/incidents.js` | `incidents`, `document_approvals` |
    | **IT Checklist** | Daily/Weekly/Monthly/Yearly | `app/actions/checklist.js` | `checklist_sessions`, `checklist_items`, `checklist_templates` |
    | **SLA** | คำนวณ working time, breached | `lib/slaUtils.js` | อ้างอิง `working_hours`, `holidays` |
    | **Setup** | Working day, Holiday, Approval workflow, Account, Checklist master/template, Logs | `app/actions/setup.js` | `holidays`, `working_hours`, `user_profiles`, `user_whitelist` |

    **ห้าม** แก้ไขไฟล์ของ module อื่นโดยไม่ได้รับคำสั่งชัดเจนจาก USER

15. **[DATABASE CONTRACT]** ห้ามสร้างตารางใหม่ในฐานข้อมูลโดยไม่ได้รับการอนุมัติจาก USER ก่อนทุกครั้ง หากต้องการตารางใหม่ให้:
    1. แจ้ง USER พร้อม schema ที่เสนอ
    2. รอ USER อนุมัติ
    3. สร้าง migration file ใน `supabase/migrations/` เท่านั้น ห้ามรัน SQL ตรงกับ production โดยไม่มี migration

16. **[SECURITY BOUNDARY — MANDATORY]** กฎความปลอดภัยต่อไปนี้มีผลบังคับใช้ทุกครั้งโดยไม่มีข้อยกเว้น:
    - **ห้ามใช้ `service_role` key ใน client-side** หรือใน Server Component ที่ไม่จำเป็น
    - **ห้ามเขียน Logic ที่ bypass RLS** ของ Supabase ไม่ว่ากรณีใดก็ตาม
    - **ห้ามแก้ไข PIN System** (6-digit Bcrypt) โดยไม่ผ่านการ review จาก USER — ให้ escalate ทันที
    - **ห้ามเปลี่ยน RBAC Role** (`admin`, `it_staff`, `approver`, `employee`, `auditor`) หรือสิทธิ์ของแต่ละ Role โดยไม่มีคำสั่งชัดเจน
    - **ทุก Server Action ที่เกี่ยวกับ approval ต้องผ่าน `workflow.js`** ห้ามเขียน approval logic ใหม่แยกต่างหาก

17. **[TAILWIND-JIT-ISSUE — SETTINGS PAGES]** ⚠️ **ปัญหาที่พบและได้รับการยืนยันแล้ว** ⚠️

    **อาการ:** Tailwind class เช่น `px-8 py-7`, `gap-5`, `text-xs`, `font-semibold` ไม่มีผลบนหน้าจอจริงใน `/dashboard/settings/*` แม้จะเขียน className ถูกต้อง

    **สาเหตุ:** Tailwind JIT (Just-In-Time) scan ไม่ครอบคลุมไฟล์ใน Settings module บางไฟล์ ทำให้ class ใหม่ที่เพิ่มเข้าไปไม่ถูก generate เป็น CSS

    **กฎบังคับ:** เมื่อทำงานกับ `/dashboard/settings/*` ทุกหน้า **ต้องใช้ inline style แทน Tailwind class** สำหรับ spacing, padding, margin, gap, font-size, color ทุกตัว:

    ```js
    // ✅ ถูกต้อง — inline style การันตีมีผลเสมอ
    <div style={{ padding: '24px 32px', borderRadius: 20, background: '#fff' }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Label</label>
      <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0' }} />
    </div>

    // ❌ ผิด — Tailwind class อาจไม่มีผลใน Settings pages
    <div className="p-6 rounded-2xl bg-white">
      <label className="text-xs font-semibold text-slate-500">Label</label>
      <input className="px-4 py-3 border border-slate-200" />
    </div>
    ```

    **Pattern มาตรฐาน:** ใช้ `const S = { card: {...}, cardHeader: {...}, cardBody: {...}, label: {...}, input: {...} }` เป็น shared style object และ `<style>{CSS}</style>` สำหรับ `:hover`, `:focus`, `@media`

    **Reference ที่ถูกต้อง:**
    - `app/dashboard/settings/users/page.js` — ใช้ inline style ทั้งหมด ทำงานถูกต้อง
    - `app/dashboard/settings/target-registry/TargetRegistryClient.js` — ใช้ `const S` pattern

    **เอกสารมาตรฐานฉบับเต็ม:** [INLINE_STYLE_STANDARD.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INLINE_STYLE_STANDARD.md)

---

# Project Agent Rules

## Stack
- Next.js 15 App Router (ห้ามใช้ Pages Router เด็ดขาด)
- Tailwind CSS v4 ⚠️ **[หมายเหตุสำคัญ]** JIT อาจ scan ไม่ครอบคลุมบางไฟล์ใน `/dashboard/settings/*` — ดูกฎ **[TAILWIND-JIT-ISSUE]** และ [INLINE_STYLE_STANDARD.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INLINE_STYLE_STANDARD.md)
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
- **[SUPERPOWERS-FIRST MANDATE]** ดูกฎฉบับเต็มในหัวข้อ Agent Mandatory Workflow ข้อที่ 5 — กฎเดียวกันมีผลบังคับใช้ที่นี่ด้วย
- **[CLOUD SYNC FLOW]** เมื่อมีการผสานโค้ดจาก Cloud AI (เช่น Google Jules) กลับมาที่กิ่งหลัก `main` บน GitHub:
  - Agent ต้องแจ้ง USER และเสนอช่วยดึงโค้ดล่าสุดกลับลงมาอัปเดตเครื่อง Localhost ด้วยคำสั่ง `git pull origin main` ทันทีเพื่อรักษาสภาพแวดล้อมให้ตรงกัน 100%
  - ห้ามเขียนทับโค้ดบนเครื่อง Localhost ด้วยมือโดยไม่มีการทำ Git Pull หรือ Git Merge อย่างถูกต้องเด็ดขาด
- **[PARALLEL CONFLICT RESOLUTION]** ในกรณีที่เครื่อง Localhost มีการแก้ไขฟีเจอร์ในขณะที่ Cloud AI ก็ทำการแก้ไขในจุดเดียวกัน (ทำให้เกิด Merge Conflict):
  - Agent ต้องหยุดและรายงานจุดที่โค้ดชนกันแก่ USER ทันที (ห้ามเดาสุ่มเลือกเวอร์ชันใดเวอร์ชันหนึ่งหรือกดลบโค้ดของอีกฝั่งทิ้ง)
  - Agent ต้องเสนอทำหน้าที่ "ผู้ประสานรวมร่างโค้ด (Conflict Resolver)" โดยการเปิดไฟล์ที่ขัดแย้ง อ่านตรรกะทั้งสองฝั่ง (Local Dev & Cloud AI) และเขียนผสาน Logic เข้าด้วยกันอย่างลงตัวโดยไม่สูญเสียความสามารถเดิมและประสิทธิภาพใหม่
  - ต้องทำการรันคำสั่งทดสอบระบบ `npm test` เพื่อตรวจสอบการทำงานร่วมกันทุกครั้งหลังจากแก้ไขความขัดแย้งเสร็จสิ้น และห้ามรายงานว่า "สำเร็จ" จนกว่าผลการเทสจะเป็น Pass 100%
- **[GIT PUSH TARGET POLICY — MANDATORY]** เมื่อ USER สั่งว่า "push" โดยไม่ได้ระบุปลายทางเพิ่มเติม ให้ถือเป็นการ push ไปที่ test repository **เท่านั้น**:
  - `https://github.com/trush000/dowa-it-system.git`
  - ห้าม push ไป production repository โดยอัตโนมัติ
  - หาก remote ปัจจุบันไม่ตรงตาม policy ให้ตั้ง/ใช้ remote ที่ชี้ไป test repository ก่อนทุกครั้ง
- **[MIGRATION TARGET POLICY — CODE + DB STRUCTURE]** เมื่อ USER สั่งว่า "migrate project" ให้ตีความเป็นการย้ายเฉพาะ:
  1) Source code
  2) Database structure / migrations
  - **ไม่รวมข้อมูลจริง (data rows)**
  - ปลายทาง migration repository คือ:
    - `https://github.com/dowa-tht/it-management.git`
  - สำหรับส่วนฐานข้อมูล ให้ย้ายเฉพาะไฟล์ schema/migration (เช่นใน `supabase/migrations/`) และห้ามย้ายไฟล์ seed data ที่เป็นข้อมูลจริงโดยไม่ได้รับอนุมัติ


---

# AI Multi-Model Workflow Control

ใช้กฎชุดนี้เมื่อ USER ต้องการให้ตรวจสอบ/แก้ไขระบบแบบแยกบทบาทระหว่าง AI วางแผนกับ AI ลงมือแก้ เช่น เมื่อ USER เรียกคำสั่ง `SmartAi`, `FastAi`, ระบุ `Task file`, สั่งให้ส่งงานต่อให้ agent ตัวเล็ก หรืออ้างอิง workflow แบบ `SCAN_SUMMARY.md`

## Role Definition

### Smart AI
**หน้าที่:** คิด วิเคราะห์ วางแผน สร้าง Task files Debug งานยาก และตัดสินใจเชิงสถาปัตยกรรม  
**ห้าม:** แก้โค้ดโดยตรงโดยไม่มี Task file ใน workflow นี้ หรือทำงาน execution ที่ Fast AI ทำได้

### Fast AI
**หน้าที่:** Execute Task files ตาม scope ที่ได้รับ, อ่านไฟล์เท่าที่จำเป็น, Self-validate, Report ผล  
**ห้าม:** วิเคราะห์หรือวางแผนนอก scope ที่กำหนดใน Task file หรือตัดสินใจเปลี่ยน logic สำคัญเอง

**ข้อจำกัดการสแกน:**
- ห้าม scan ทั้ง codebase โดยไม่มี Task directive หรือ Human approval
- หาก scope ไม่พอ ต้อง escalate ด้วย format `ESCALATE`

**Fast AI Stop Conditions:**
- ขาดไฟล์ input สำหรับทำงาน
- ต้องอ่านไฟล์นอก Scope
- ต้องแก้ schema/env/security boundary
- เมื่อเข้าเงื่อนไข ให้หยุดและใช้ format `ESCALATE` ทันที

## [ROLE CONFIRMATION — MANDATORY]

เมื่อเริ่ม session ใหม่ทุกครั้ง AI ต้องรายงานตัวและรอ USER ยืนยัน Role ก่อนเสมอ:

```text
รายงานตัว (Role Confirmation)
Model    : [ชื่อ model จริง เช่น Gemini 2.5 Pro / Claude Sonnet / GPT-4o]
Role     : [Smart AI / Fast AI]
เหตุผล  : [ทำไมถึงประเมินตัวเองเป็น Role นี้ เช่น "รับ Task File มาเพื่อ execute"]

รอ USER พิมพ์ "ยืนยัน Role" ก่อนเริ่มทำงาน
```

กฎบังคับ:
- ห้าม execute งานใดๆ ก่อนได้รับการยืนยัน Role จาก USER
- หาก USER แจ้งว่า Role ผิด → หยุดทันที ไม่ทำงานต่อ แจ้งให้ USER เปลี่ยน model หรือแก้ Role
- Superpowers เป็นแนวปฏิบัติสนับสนุนการทำงาน ไม่ใช่กฎที่ override คำสั่งโดยตรงของ USER

## [SESSION SWITCH POLICY — MANDATORY]

เมื่อต้องสลับ model ไม่ว่าจะด้วยเหตุใด (limit เต็ม, เปลี่ยน Role, เปลี่ยนเครื่องมือ) ให้ปฏิบัติตามลำดับนี้เสมอ:

1. พิมพ์ `"สรุป handoff ด่วน"` ใน session ปัจจุบัน **ก่อน** ปิด session
2. รับ Emergency Handoff Report จาก model ปัจจุบัน (ดู format ด้านล่าง)
3. **เปิด session ใหม่** กับ model ใหม่เสมอ ห้ามต่องานในแชทเดิมของ model อื่น
4. ส่งให้ model ใหม่เฉพาะ: `AGENTS.md` + `Task File` + `Handoff Report`
   — ห้ามส่ง conversation history ของ session เก่า เพราะ context ปนกันทำให้ model สับสน
5. รอ Role Confirmation จาก model ใหม่ก่อน execute

**ห้าม** พิมพ์ `"ดำเนินการต่อ"` หรือ `"ต่อได้"` โดยไม่มี Handoff Report แนบมาด้วย

## [EMERGENCY HANDOFF — MANDATORY]

เมื่อ AI ใกล้ limit หรือถูกตัดกลางงาน ให้ตอบใน format นี้ทันที:

```text
EMERGENCY HANDOFF
─────────────────────────────
Task     : [ชื่อ Task File]
Step     : [ทำถึง Step ที่เท่าไหร่ จาก Step ทั้งหมดกี่ Step]

ทำเสร็จแล้ว:
  - [ไฟล์ + สิ่งที่เปลี่ยนไปจริงๆ]

ค้างอยู่:
  - [ไฟล์ + บรรทัดที่หยุด + สิ่งที่ยังไม่ได้ทำ]

จุดเสี่ยงที่ model ใหม่ต้องระวัง:
  - [side effect, dependency, หรือ constraint พิเศษที่พบ]

Step ถัดไปสำหรับ model ใหม่:
  - [คำสั่งที่ชัดเจน 1-3 ข้อ ไม่ใช่แค่ "ทำต่อ"]
─────────────────────────────
```

กฎบังคับ:
- AI ต้องสามารถสร้าง Emergency Handoff ได้ทุกเมื่อที่ USER ขอ ไม่ว่าจะอยู่กลางงานหรือใกล้ limit
- ห้ามตอบว่า "ไม่สามารถสรุปได้" — ให้สรุปเท่าที่ทราบและระบุส่วนที่ไม่แน่ใจชัดเจน

## [TASK FILE SCOPE LOCK — MANDATORY]

Smart AI ต้องระบุ section `## Scope Lock` ในทุก Task File ที่สร้าง โดย Smart AI เป็นผู้กำหนดขอบเขตจากความเข้าใจ architecture ของระบบ:

```markdown
## Scope Lock
อ่านและแก้ได้เฉพาะ:
  - [path ไฟล์ที่ต้องใช้จริงๆ]

ห้ามแตะ:
  - [path ไฟล์ที่อยู่ใกล้แต่ไม่ใช่ scope ของงานนี้]

ถ้าต้องการไฟล์นอก list นี้ → ESCALATE ทันที ห้ามเดาสุ่มเปิดไฟล์อื่น
```

กฎบังคับ:
- Fast AI ห้าม execute Task File ที่ไม่มี `## Scope Lock` section
- Fast AI ห้าม scan ไฟล์นอก Scope Lock โดยไม่มี ESCALATE ก่อน
- USER ไม่ต้องกำหนด Scope Lock เอง — เป็นหน้าที่ของ Smart AI ที่วางแผนงาน

## [FUNCTION REGISTRY — MANDATORY]

**AI ทุกตัว ทุก Role ต้องอ่าน `ai-tasks/FUNCTION_REGISTRY.md`
เป็นไฟล์แรกก่อนเริ่มงานทุกครั้ง**

Fast AI ใช้เพื่อ:
- หา function และ path ไฟล์ที่ต้องแก้ไข
- ถ้าไม่พบ → ESCALATE ทันที ห้าม scan เพิ่ม

Smart AI ใช้เพื่อ:
- ตรวจว่างานที่วางแผนกระทบ function ใดบ้าง
- เขียน Scope Lock ใน Task File ได้ถูกต้อง
- ถ้าพบ function ที่ยังไม่อยู่ใน Registry → เพิ่มก่อนส่ง Task File

ทั้งคู่ต้องรายงานในบรรทัด Registry ตอน Role Confirmation:
Registry : อ่านแล้ว ✓ / ยังไม่ได้อ่าน ✗

## [FUNCTION REGISTRY MAINTENANCE — MANDATORY]

Smart AI ต้องอัปเดต `ai-tasks/FUNCTION_REGISTRY.md` ทุกครั้งที่:
- สร้าง function หรือ server action ใหม่
- ย้าย function ไปไฟล์อื่น
- ลบ function ออก

โดยอัปเดตพร้อมกับ Task File ใน Step เดียวกัน ห้ามแยก commit

Format มาตรฐานของ `ai-tasks/FUNCTION_REGISTRY.md`:

```markdown

## [FUNCTION REGISTRY — SCAN SCOPE]
เมื่อ Smart AI สร้างหรืออัปเดต Registry ต้องสแกนครบทุก pattern นี้:
  - app/actions/*.js          ← Server Actions ทั้งหมด
  - app/dashboard/**/page.js  ← Page components
  - app/dashboard/**/*Client.js  ← Client components แยกไฟล์
  - components/**/*.js        ← Shared components
ห้ามสแกนแค่ page.js อย่างเดียว


# Function Registry
<!-- อัปเดตโดย Smart AI ทุกครั้งที่มีการเปลี่ยนแปลง function -->

## [module] เช่น checklist / auth / asset / incident
| ฟังก์ชัน (ภาษาไทย) | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| สร้าง checklist doc | app/dashboard/checklist/page.js | handleFinalCreate() | L700+ |
| ตรวจสอบเอกสารซ้ำ | app/dashboard/checklist/page.js | getPeriodRange() | |
| ตรวจสิทธิ์ admin/it_staff | app/actions/auth.js | requireAdminProfile() | throw ถ้าไม่มีสิทธิ์ |
```

หมายเหตุ: ถ้ายังไม่แน่ใจว่า function อยู่ที่ไหน ให้ระบุ `"ยังไม่ verified"` ห้ามเดา

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
Step 1  Fast AI     Scoped Scan ตาม Task input เท่านั้น
                    Output → SCAN_SUMMARY.md หรือ MODULE_SCAN_SUMMARY.md
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
Scope  : [allowed paths เช่น app/actions/incidents.js, components/workflow/*]
OutOfScope: [paths ที่ห้ามแตะ]
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
| `ยืนยัน Role` | ยืนยันว่า Role ที่ AI รายงานถูกต้อง เริ่มได้ |
| `ต่อ` | เริ่ม Step ถัดไปได้ |
| `หยุด` / `stop` | หยุดทันที รอคำสั่งใหม่ |
| `ยกเลิก` / `cancel` | ยกเลิก Task ปัจจุบัน อัปเดต status เป็น Cancelled |
| `รายงาน` | สรุปสถานะทุก Task ในรูปแบบ Session Summary |
| `retry` | ลองทำ Task ปัจจุบันใหม่อีกครั้ง และนับ retry count |
| `สรุป handoff ด่วน` | หยุดงาน สร้าง Emergency Handoff Report ทันที ก่อนปิด session |

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
