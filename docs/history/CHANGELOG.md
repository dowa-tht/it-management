# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 18 พฤษภาคม 2569 (18-May-2026)
- **21:25 +07:00 | MOBILE PHOTO CONTENT-TYPE FIX:** แก้ไขปัญหาการอัปโหลดรูปภาพล้มเหลวบนโทรศัพท์มือถือที่ฟ้องข้อความ `Content-Type was not one of "multipart/form-data" or "application/x-www-form-urlencoded"`
  - เพิ่ม explicit header `'Content-Type': 'application/json'` ในฟังก์ชัน `handleUpload` ของคอมโพเนนต์ `PhotoTemplate` ภายในไฟล์ [app/dashboard/checklist/[id]/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js) เพื่อบังคับให้ API Route `/api/upload/onedrive` แยกแยะ Payload ประเภท JSON (Base64) ได้อย่างถูกต้อง ไม่ตกไปฝั่ง parsing `req.formData()`
  - รันการทดสอบระบบผ่าน `npm test` ผลลัพธ์ผ่านการทดสอบ 100% (9/9 pass)
  - พร้อมทำการบันทึกและพุชข้อมูลขึ้น GitHub (`git push origin main`) เพื่อทำการ Deploy ใหม่บน Vercel
- **19:20 +07:00 | MOBILE PHOTO ROBUST EXCEPTION HANDLING:** แก้ปัญหา Silent Failure และอาการหมุนค้างระหว่างการอัปโหลดภาพถ่ายขนาดใหญ่บนโทรศัพท์มือถือ
  - ครอบคลุมชุดคำสั่งด้วย `try-catch` แบบเบ็ดเสร็จ (Comprehensive Exception Boundary) สำหรับวงจรชีวิตรูปภาพทั้งหมด ตั้งแต่ `FileReader.readAsDataURL`, `Image.onload`, ไปจนถึง `canvas.toDataURL` ในไฟล์ [app/dashboard/checklist/[id]/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js)
  - เพิ่มดักจับข้อผิดพลาด `img.onerror` และ `reader.onerror` พร้อมแจ้ง `alert` ให้ผู้ใช้ทราบ หากภาพถ่ายมีไฟล์ขนาดใหญ่เกินไป หรือเกิดปัญหา Memory Crash บน Mobile Safari / Android WebView
  - ลดขนาด Canvas Scale อัตโนมัติ (จำกัดความกว้างสูงสุด 1200px) ป้องกันปัญหา Canvas Limit บนอุปกรณ์มือถือที่มีแรมน้อย 
  - ล้างค่า File Input อัตโนมัติ (`e.target.value = ''`) เพื่อป้องกันบั๊กการอัปโหลดซ้ำไฟล์เดิมแล้ว `onChange` ไม่ยอมทำงาน
- **19:00 +07:00 | MOBILE PHOTO EVIDENCE GRAPH & SCHEMA SYNC:** แก้ไขข้อผิดพลาดเชิงลึกของการดึงภาพถ่ายและการเชื่อมต่อ OneDrive บนโทรศัพท์มือถือ
  - ปรับปรุงการสืบค้นข้อมูลพิกัดและภาพถ่ายแบบสองทิศทาง (Bidirectional Resolution) ในไฟล์ [app/dashboard/checklist/[id]/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js) ให้รองรับการอ่านและคำนวณจำนวนรูปภาพ/พิกัด GPS ครบถ้วนจากทั้งโครงสร้างข้อมูลเกบล่าสุด (`photos_by_point`, `photo_meta_by_point`) ที่ผูกตาม Point ID/Code และโครงสร้างข้อมูลดั้งเดิม (`photos`, `photo_meta`) ที่ผูกตามลำดับดัชนี
  - ติดตั้งตัวบังคับการค้นหาโดเมนอินเทอร์เน็ตแบบ IPv4 First ในไฟล์ [lib/onedrive.js](file:///c:/Users/Lenovo/dowa-it-system/lib/onedrive.js) เพื่อแก้ปัญหา Windows / Node.js 18+ dual-stack (IPv6 preferred) ส่งผลให้การ fetch ไปยัง `login.microsoftonline.com` เกิด error `fetch failed`
  - ปรับปรุงตรรกะของฟังก์ชัน `handleUpload` ในคอมโพเนนต์ `PhotoTemplate` ให้ครอบคลุมด้วยชุดคำสั่ง `try-catch` อย่างเป็นระบบ หากเซิร์ฟเวอร์หรือ Microsoft Graph เกิดข้อผิดพลาด จะส่งการแจ้งเตือน `alert` และเปลี่ยนแบนเนอร์แสดงรายละเอียดข้อผิดพลาดทันที แทนการหมุนค้างและเงียบหาย (Silent Failure)
  - รันการตรวจสอบความถูกต้องของการเชื่อมต่อสิทธิ์ OneDrive ผ่านสคริปต์ `scratch/test_onedrive.js` สามารถอัปโหลดและดาวน์โหลดไฟล์ทดสอบสำเร็จ 100%
- **17:30 +07:00 | MOBILE PHOTO EVIDENCE BUGFIX:** แก้ไขปัญหาการถ่ายภาพบนโทรศัพท์มือถือแล้วรูปไม่บันทึก/ไม่แสดงตัวอย่างผลลัพธ์ (เนื่องจากปัญหา WebKit / Mobile Browser ละเลยสถานะ `disabled` บนป้าย `<label>`)
  - ปรับโครงสร้างส่วนแสดงผลจุดเช็คพอยต์ภาพถ่ายว่างในกรณีล็อก (`disabled === true`) ให้ใช้แท็ก `<div>` แทน `<label>` ในไฟล์ [app/dashboard/checklist/[id]/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js) เพื่อป้องกันไม่ให้เบราว์เซอร์บนมือถือเปิดกล้อง/เลือกภาพได้เมื่อเอกสารอยู่ในสถานะล็อก
  - เพิ่มเงื่อนไขป้องกันการอัปโหลด (`disabled` Check Guard) ที่ด้านบนสุดของฟังก์ชัน `handleUpload` โดยจะแจ้งเตือนผู้ใช้ด้วย `alert` ให้กดปุ่มแก้ไขที่แถบด้านล่างก่อนดำเนินการ เพื่อป้องกันการ Fail Silently และ Early Return ใน `updateItemData`
  - ทำการตรวจสอบภาพรวมระบบและการผสานความเข้ากันได้ และรันการตรวจสอบไฟล์จริง (Double-Verification Check) สำเร็จ 100%
- **17:00 +07:00 | AUDIT & VERIFICATION REPORT:** ตรวจสอบกระบวนการและเงื่อนไขอนุมัติเอกสาร DTT-CHK-2605-010 พร้อมจัดทำรายงานอิงหลักฐานแบบบรรทัดต่อบรรทัด (Evidence-Based Verification)
  - เขียนรายงานการวิเคราะห์และตรวจสอบความสอดคล้องมาตรฐานเวิร์กโฟลว์ของโครงการที่ [audit_report_checklist_dtt_chk_2605_010.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/audit_report_checklist_dtt_chk_2605_010.md) และลงทะเบียนลิงก์ในดัชนีรวม [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md)
  - วิเคราะห์และพิสูจน์ตรรกะการทำงานของเงื่อนไขการส่งอนุมัติ (`canSubmit`) ในไฟล์ [app/dashboard/checklist/[id]/page.js:L316](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/%5Bid%5D/page.js#L316) ร่วมกับขั้นตอนเวิร์กโฟลว์ส่วนกลางใน [app/actions/workflow.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/workflow.js)
  - ยืนยันว่าเอกสาร DTT-CHK-2605-010 ในฐานข้อมูลมีรายการตรวจสอบที่บันทึกผล `"OK"` ครบ 100% จึงพร้อมส่งอนุมัติได้ทันที และเวิร์กโฟลว์จะทำงานถูกต้องตามมาตรฐานโดยสมบูรณ์
- **16:15 +07:00 | IMPLEMENT CHECKLIST VIEW/EDIT LOCK STATE MACHINE:** ออกแบบและติดตั้งระบบป้องกันความเสถียรข้อมูลและการบังคับตรวจสอบ (View/Edit Lock Flow) บนหน้าเอกสาร Checklist รายจุด
  - เขียนแผนฟื้นฟูและการใช้งานทางเทคนิคที่ [remediation_plan_checklist_edit_lock.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/2d582279-1959-4b08-9b21-c7b507fc067e/remediation_plan_checklist_edit_lock.md)
  - ติดตั้งตัวควบคุมสถานะการแก้ไข `isEditing` และคำนวณสิทธิ์ `isLocked` (`isClosed || isAuditor || !isEditing`) บนไฟล์ [app/dashboard/checklist/[id]/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js) เพื่อล็อกอินพุตการกรอกข้อมูล OK/NG, การป้อนค่าตัวเลขและข้อความ, และการอัปโหลดไฟล์ทั้งหมดหากยังไม่กดปุ่มแก้ไข
  - ปรับปรุงฟังก์ชันบันทึกตัวแปร (`updateItemData`, `handleStatusClick`, `handleNgConfirm`) ให้มีเงื่อนไข early return ป้องกันการเขียนเข้าฐานข้อมูลเมื่ออยู่ภายใต้โหมดล็อกความปลอดภัย (Lock Mode)
  - เชื่อมโยงสถานะและปุ่มควบคุมเข้ากับส่วนควบคุมกลาง [WorkflowActionBar](file:///c:/Users/Lenovo/dowa-it-system/components/workflow/WorkflowActionBar.js) เพื่อเปลี่ยนปุ่มระหว่าง ✏️ แก้ไข กับ 💾 บันทึก / ยกเลิก ได้อย่างสมบูรณ์แบบ
  - แก้ไขจุดบกพร่องชื่อ Prop บน Component `<TemplateRenderer>` จาก `isVisitor={isAuditor}` เป็น `isAuditor={isAuditor}` ตามข้อกำหนด Interface
  - ตรวจสอบผ่านการทำ `npm test` ผลลัพธ์ผ่าน 100% (9/9 pass)
- **15:45 +07:00 | UI/UX & SPACING REFACTOR:** แก้ไขปัญหาระยะขอบ (Spacing) และความหนาแน่นขององค์ประกอบในหน้าจอสร้างเทมเพลตแบบ Photo Evidence (ui_template_type: 1)
  - เขียนแผนปฏิบัติการ [remediation_plan_photo_evidence_spacing.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/remediation_plan_photo_evidence_spacing.md) และลงทะเบียนใน [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md)
  - เพิ่ม explicit layout classes ได้แก่ `photo-evidence-stack` (grid gap-5), `photo-points-list` (grid gap-3), `photo-point-row` (flex gap-3 background-white shadow-sm border border-slate-100 rounded-2xl), และ `photo-config-card` (responsive 2-column grid gap-4 background-white border border-slate-100 rounded-2xl padding-5) เข้าไปใน css style tag ของ [app/dashboard/settings/checklist-template-builder/components/TemplateForm.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/checklist-template-builder/components/TemplateForm.js)
  - ปรับปรุงโครงสร้าง JSX ภายในส่วนพฤติกรรมเทมเพลตถ่ายรูป (`ui_template_type === 1`) ให้ใช้งาน explicit CSS class เหล่านี้แทนการใช้งาน Tailwind spacing classes (space-y-*) โดยตรง เพื่อการันตีกระบวนการจัดระยะขอบที่เสถียร สวยงามพรีเมียม และเข้ากันได้กับระบบสไตล์ดั้งเดิม
  - ตรวจสอบความถูกต้องและผ่านการตรวจสอบเฉพาะจุดด้วย ESLint 100% ไร้ข้อผิดพลาด
- **15:30 +07:00 | BUGFIX & COMPATIBILITY:** แก้ไขปัญหาการสร้าง/บันทึก Checklist Template สำหรับเทมเพลตประเภทถ่ายรูป (ui_template_type: 1)
  - ปรับปรุงการตรวจสอบข้อมูล (Validation Schema) ใน [lib/checklistTemplateValidation.js](file:///c:/Users/Lenovo/dowa-it-system/lib/checklistTemplateValidation.js) ให้ยอมรับโครงสร้างข้อมูล `photo_points` ทั้งแบบที่เป็นอาร์เรย์ข้อความดั้งเดิม (`string[]`) และแบบที่เป็นวัตถุที่มีรายละเอียดสมบูรณ์ (`object[]` / Mixed) เพื่อรองรับจุดเช็คพอยต์ภาพถ่ายที่มีฟิลด์เพิ่มเติม เช่น `point_code`, `label`, `qr_enabled`
  - ปรับแต่งฟังก์ชันแสดงผลเทมเพลตพรีวิว `buildTemplatePreview` (กรณี `ui_template_type` เป็น 1) ให้สามารถแสดงผลข้อมูลชื่อจุดหรือรหัสจุดเช็คพอยต์ที่เป็นอาร์เรย์ผสม/วัตถุได้อย่างสมบูรณ์ ป้องกันไม่ให้เกิดหน้าจอว่างหรือข้อผิดพลาดแบบ `[object Object]` บนฝั่ง Frontend
  - เพิ่มชุดการทดสอบใหม่ (TDD) ใน [tests/target-registry.test.js](file:///c:/Users/Lenovo/dowa-it-system/tests/target-registry.test.js) เพื่อทดสอบการรับค่า `photo_points` ทั้งแบบข้อความผสมวัตถุและการตรวจสอบโครงสร้างภายในวัตถุ
  - รันการทดสอบระบบผ่านการทำ `npm test` ผลลัพธ์ผ่านการทดสอบ 100% (9/9 pass)
- **10:30 +07:00 | DEPLOY & UPDATE:** บันทึกข้อบังคับพฤติกรรม AI Agent และการปฏิบัติตาม Superpowers Skills เข้าสู่กฎของโครงการ
  - อัปเดตกฎหลัก [AGENTS.md](file:///c:/Users/Lenovo/dowa-it-system/AGENTS.md) เพิ่มหัวข้อ **[SUPERPOWERS INTEGRATION]** เพื่อควบคุมจรรยาบรรณการทำงานของ AI ทั้งแบบ Local และ Cloud
  - อัปเดตไฟล์ตั้งค่าสภาพแวดล้อม [.cursorrules](file:///c:/Users/Lenovo/dowa-it-system/.cursorrules) และ [.julesrules](file:///c:/Users/Lenovo/dowa-it-system/.julesrules) เพื่อบังคับให้ผู้ช่วย AI ตรวจสอบและยึดโยงแนวปฏิบัติตามคู่มือ Superpowers ทุกครั้ง
- **10:15 +07:00 | CHORE:** ดำเนินการติดตั้งและผสานโครงสร้างห้องสมุด **Superpowers Skills Library (v5.1.0)** สำเร็จ
  - คัดลอกและจัดหมวดหมู่โฟลเดอร์ทักษะความสามารถทั้ง 14 รายการจาก `scratch/superpowers/skills` ไปยัง [docs/standards/superpowers/](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/superpowers/)
  - สร้างคู่มือแนะนำการใช้งานอย่างเป็นทางการที่ [docs/standards/SUPERPOWERS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SUPERPOWERS.md) และลงทะเบียนลิงก์ในสารบัญหลัก [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md)
- **10:05 +07:00 | VERIFY & DEPLOY:** ยืนยันการรัน SQL Migration สำหรับระบบแชร์เอกสาร Checklist และการเปิดใช้งาน RLS สำเร็จ
  - ตรวจสอบผ่านการคิวรีฐานข้อมูลจริงบน Supabase พบว่าฟังก์ชันความปลอดภัย `current_user_can_access_checklist_doc` และ RLS Update Policy ของตาราง `checklist_docs`, `checklist_items` ได้รับการติดตั้งและอัปเกรดสำเร็จ 100%
  - ยืนยันการเปิดใช้งาน RLS และนโยบาย SELECT/ALL บนตาราง `checklist_targets`, `checklist_target_groups`, และ `checklist_template_targets` เรียบร้อย ปลอดภัยและตรงตามมาตรฐานสถาปัตยกรรมของโครงการ
- **10:00 +07:00 | VERIFY & AUDIT:** ตรวจสอบความถูกต้องและทดสอบฟังก์ชันป้องกันการสร้างเอกสารซ้ำแบบสากล (Global Duplicate Prevention) และการทำงานร่วมกันบนตาราง Checklist ของ IT Staff/Admin
  - ยืนยันว่าไฟล์ [app/dashboard/checklist/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js) ปราศจากปัญหาการประกาศตัวแปร `selectedTemplates` ซ้ำซ้อนเรียบร้อยแล้ว โดยมีการใช้ค่าอ้างอิงของ Scope ด้านบนอย่างประณีต ส่งผลให้ไม่มี Compile-time crash ใดๆ
  - ทำการวิเคราะห์โครงสร้างฐานข้อมูลและนโยบาย RLS ล่าสุดของตาราง `checklist_docs`, `checklist_items`, `checklist_targets`, `checklist_target_groups`, และ `checklist_template_targets` พร้อมรันการทดสอบระบบ SQL Migration
  - รายงานปัญหาทางเทคนิคและแนวทางการแก้ไขแก่ผู้ใช้งานเกี่ยวกับสถานะธุรกรรมฐานข้อมูลระยะไกล (Remote Database Read-Only Mode) ทำให้ไม่สามารถปรับปรุง DDL/RLS Policies ผ่าน MCP Server ได้โดยตรง และให้คำแนะนำที่ชัดเจนเพื่ออัปเกรด/Link หรือรัน SQL Migration ใน SQL Editor
  - รันคำสั่งทดสอบระบบ `npm test` ผลการทดสอบผ่าน 100% (8/8 tests passed) ไร้ข้อผิดพลาดและเสถียรอย่างสมบูรณ์ตามข้อกำหนดความปลอดภัยของโครงการ
- **09:57 +07:00 | CHORE:** ดำเนินการตรวจสอบ Change Log และทำ Daily Log Shrinking สำเร็จ โดยย้ายบันทึกของวันที่ 17 พฤษภาคม 2569 ไปยังไฟล์ [CHANGELOG_2026_05_17.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_17.md) และล้างประวัติย้อนหลังเรียบร้อย พร้อมเริ่มงานวันใหม่ตามมาตรฐาน `AGENTS.md`

---

## 📦 บันทึกย้อนหลัง (Archives)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_17.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_17.md)
- [CHANGELOG_2026_05_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_15.md)
- [CHANGELOG_2026_05_14.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_14.md)
- [CHANGELOG_2026_05_13.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_13.md)
- [CHANGELOG_2026_05_12.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_12.md)
- [CHANGELOG_2026_05_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_11.md)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 18-May-2026*
