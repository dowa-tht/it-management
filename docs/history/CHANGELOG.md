# 🕒 ประวัติการเปลี่ยนแปลง (Changelog)

## 15 มิถุนายน 2569 (15-Jun-2026)

- **[16:05] Fix Production Approval Token Drift and CHK Reset Contract**
  - เพิ่ม migration [20260615_fix_approval_tokens_runtime_contract.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260615_fix_approval_tokens_runtime_contract.sql) เพื่อเติม public approval token runtime contract ที่ production ขาดอยู่ โดยเฉพาะ `revoked_at`, `revoked_reason`, `token_hash`, `consumed_at`, `session_hash`, และ `session_expires_at`
  - apply migration ไป production database `yrgsukhjkoexvdybyyjm` สำเร็จ และตรวจยืนยันหลัง apply แล้วว่า query `approval_tokens.revoked_at` ไม่ error อีกต่อไป
  - reset production data ของ `CHK` line รอบ `2026-06` ให้ `starting_no = DTT-CHK-2606-001` พร้อม clear `last_no_used`/`last_date_used` ที่ header และ line เพื่อเตรียมการทดสอบสร้างเอกสารใหม่ตาม setup
- **[16:18] Align No. Series Runtime with Explicit Starting Number**
  - เพิ่ม helper กลาง [noSeriesRuntime.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeriesRuntime.js) และปรับ [noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js) ให้ `starting_no` ของ active line override persisted document history ได้ เมื่อ line นั้นยังไม่มี `last_no_used`
  - เพิ่ม regression tests ที่ [no-series-runtime.test.js](/C:/Users/Lenovo/dowa-it-system/tests/no-series-runtime.test.js) ครอบคลุมกรณี reset line, continuation จาก `last_no_used`, และ numeric `starting_no`
  - ยืนยันผ่าน `npm test` 40/40, `npm run build`, และ `npm test` ซ้ำบน production release clone ก่อน push

- **[08:35] Prepare Checklist RLS Compatibility Fix for Production Drift**
  - เพิ่ม migration [20260615_fix_checklist_rls_approved_by_type_cast.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260615_fix_checklist_rls_approved_by_type_cast.sql) เพื่อ redefine helper `current_user_can_read_checklist_doc()` และ `current_user_can_access_checklist_doc()`
  - แก้การเทียบ `checklist_docs.approved_by` กับ `auth.uid()` ให้ใช้ `::text` ทั้งสองฝั่ง เพื่อลด schema drift ระหว่าง environment ที่เก็บ `approved_by` เป็น `uuid` หรือ `text`
  - รอบนี้เป็นการเตรียม fix ใน Development Mode เท่านั้น ยังไม่ได้ apply migration ไป production
- **[08:52] Add Migration Planning Pack for Production Checklist RLS Fix**
  - สร้างเอกสาร [IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_RLS_FIX_2026_06_15.md](/C:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_RLS_FIX_2026_06_15.md) เพื่อสรุป release scope, migration file list, verification plan, rollback plan, และ stop conditions
  - อัปเดต [docs/INDEX.md](/C:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมเอกสารแผนใหม่ในหมวด Implementation History
- **[09:20] Apply Production Checklist RLS Fix**
  - apply migration [20260615_fix_checklist_rls_approved_by_type_cast.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260615_fix_checklist_rls_approved_by_type_cast.sql) ไปยัง production database `yrgsukhjkoexvdybyyjm` สำเร็จ
  - ตรวจยืนยันหลัง apply แล้วว่า helper `current_user_can_access_checklist_doc()` และ `current_user_can_read_checklist_doc()` ไม่เหลือนิพจน์ `d.approved_by = auth.uid()::text` และเปลี่ยนเป็น `d.approved_by::text = auth.uid()::text` ครบทั้งสองฟังก์ชัน
  - บันทึก snapshot ก่อน/หลังการตรวจไว้ชั่วคราวเพื่อ verification แล้วล้างออกจาก `brain/` ตาม scratch workspace policy
- **[10:05] Phase 1 No. Series Standard Alignment Audit**
  - ตรวจเทียบ code path และ DB state ของ `CHK` ระหว่าง dev/prod พบว่า preview หน้า `No. Series` กับ runtime create flow ใช้กติกาคนละชุด
  - ยืนยันว่า production มี relation drift ของ `no_series_lines -> no_series` ทำให้ query `no_series(format, linked_form)` ใช้ได้ใน dev แต่ล้มใน production
  - สร้างเอกสาร [IMPLEMENTATION_PLAN_NO_SERIES_STANDARD_ALIGNMENT_2026_06_15.md](/C:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_NO_SERIES_STANDARD_ALIGNMENT_2026_06_15.md) เพื่อกำหนด target standard และลำดับงานสำหรับ Phase 2
- **[11:27] Phase 2 No. Series Runtime Alignment (Development Source)**
  - refactor [lib/noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js) ให้เลิกพึ่ง relation select แบบ `no_series(format, linked_form)` และแยก flow `peek/get next number` ออกจาก `update last number` อย่างชัดเจน
  - ปรับ [app/dashboard/checklist/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js) ให้สร้างเลข `CHK` ตาม `period_date` จริง และ sync `header/line` ด้วย working date เดียวกันหลัง insert สำเร็จ
  - ปรับ [app/dashboard/settings/no-series/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/no-series/page.js) ให้ preview เรียก helper กลางตัวเดียวกับ runtime จริง
  - เพิ่ม migration [20260615_align_no_series_runtime_contract.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260615_align_no_series_runtime_contract.sql) เพื่อกำหนด schema contract ของ `no_series` / `no_series_lines` และ foreign key `series_code -> no_series.code`
- **[11:37] Verify Development No. Series Runtime Against Live Dev Data**
  - ตรวจ dev data จริงผ่าน service role ของ project `fhcsvvlwhwqzlsltrkuq` แล้วยืนยันว่า `CHK` มี next number = `DTT-CHK-2606-002` และ `INC` มี next number = `DTT-INC-2606-011` ตาม persisted documents ปัจจุบัน
  - ยืนยันว่า dev schema ปัจจุบันยัง resolve relation `no_series_lines -> no_series` ได้จาก query สด แม้ runtime helper ใหม่จะไม่พึ่ง relation นี้โดยตรงแล้ว
  - ทำ isolated integration test ด้วย series ชั่วคราวแบบ unlinked เพื่อยืนยันว่า `updateLastNo()` sync ค่า `last_no_used` ทั้งใน `no_series` และ `no_series_lines` สำเร็จ แล้วล้างข้อมูลทดสอบออกจาก dev เรียบร้อย
- **[11:56] Execute Production No. Series Alignment Release**
  - apply migrations [20260615_align_no_series_runtime_contract.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260615_align_no_series_runtime_contract.sql) และ [20260615_repair_chk_no_series_state_from_latest_doc.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260615_repair_chk_no_series_state_from_latest_doc.sql) สำเร็จบน production database `yrgsukhjkoexvdybyyjm`
  - ยืนยันหลัง apply แล้วว่า FK `no_series_lines_series_code_fkey` ถูกสร้าง, relation probe ผ่าน, และ `CHK` line ถูก sync เป็น `DTT-CHK-2606-003` ทำให้ next number คาดหมายเป็น `DTT-CHK-2606-004`
  - sync code ไป production repo `dowa-tht/it-management` สำเร็จที่ commit `12a4bb9` เพื่อให้ runtime helper, checklist create flow, และ no-series preview ใช้มาตรฐานเดียวกับ development source
  - สร้างเอกสาร [IMPLEMENTATION_PLAN_PRODUCTION_NO_SERIES_ALIGNMENT_2026_06_15.md](/C:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_NO_SERIES_ALIGNMENT_2026_06_15.md) เพื่อเก็บ release scope, rollback plan, verification, และ execution result ของรอบ production นี้
- **[12:48] Fix Checklist Cancel Regression in Development Source**
  - แก้ [workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js) ที่ `cancelDocument()` เคย hardcode `reported_by_id` และ reporter fields แบบ incident-only ใน query กลางของทุก document type
  - ปรับ query ให้ใช้ `.select('*')` จากตารางตาม `WORKFLOW_DOC_REGISTRY` เพื่อให้ checklist ยกเลิกเอกสารได้โดยไม่อ้างคอลัมน์ที่ไม่มีใน `checklist_docs` ขณะ incident flow ยังอ่าน reporter fields จาก schema ของ `incidents` ได้ตามเดิม
  - เพิ่ม regression test ใน [incident-otp-flow.test.js](/C:/Users/Lenovo/dowa-it-system/tests/incident-otp-flow.test.js) และยืนยันผ่านทั้ง `npm test` กับ `npm run build`
- **[13:20] Promote Checklist Cancel Fix to Production**
  - sync code-only fix นี้ไป production repo `dowa-tht/it-management` สำเร็จที่ commit `2b510f8`
  - release diff บน production จำกัดเฉพาะ `workflow.js`, regression test, `docs/INDEX.md`, `docs/history/CHANGELOG.md`, และ [IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_CANCEL_FIX_2026_06_15.md](/C:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_CANCEL_FIX_2026_06_15.md)
  - ยืนยันบน production clone แล้วว่า `npm test` ผ่าน 35/35; ส่วน `npm run build` ล้มจากข้อจำกัด Turbopack ต่อ `node_modules` junction ชั่วคราว ไม่ใช่จาก source diff ของ fix นี้
- **[14:05] Standardize Checklist Recreate Rule for Cancelled Untouched Docs**
  - เพิ่ม helper กลาง [checklistPeriodUsage.js](/C:/Users/Lenovo/dowa-it-system/lib/checklistPeriodUsage.js) เพื่อกำหนดกติกาเดียวกันว่าถ้าเอกสาร `Cancelled` และ item ทุกตัว `status = null` ต้องไม่นับเป็น `used`
  - ปรับ [page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js) ทั้งตอนเปิด modal และตอนกดสร้างจริง ให้ ignore เฉพาะ `Cancelled + untouched` แต่ยัง block เอกสาร active หรือ `Cancelled` ที่มีการตรวจแล้ว
  - เพิ่ม unit tests ที่ [checklist-period-usage.test.js](/C:/Users/Lenovo/dowa-it-system/tests/checklist-period-usage.test.js) และยืนยันผ่าน `npm test` 37/37 กับ `npm run build`
- **[14:24] Promote Checklist Recreate Rule Fix to Production**
  - sync code-only fix นี้ไป production repo `dowa-tht/it-management` สำเร็จที่ commit `e025cd4`
  - release diff บน production จำกัดเฉพาะ `app/dashboard/checklist/page.js`, [checklistPeriodUsage.js](/C:/Users/Lenovo/dowa-it-system/lib/checklistPeriodUsage.js), [checklist-period-usage.test.js](/C:/Users/Lenovo/dowa-it-system/tests/checklist-period-usage.test.js), `docs/INDEX.md`, `docs/history/CHANGELOG.md`, และ [IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_RECREATE_AFTER_CANCEL_FIX_2026_06_15.md](/C:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_RECREATE_AFTER_CANCEL_FIX_2026_06_15.md)
  - ยืนยันบน production clone แล้วว่า `npm test` ผ่าน 37/37 และใช้ผล `npm run build` ที่ผ่านจาก development source เป็น release gate ของรอบนี้

## 📦 บันทึกย้อนหลัง (Archives)

### มิถุนายน 2569 (June 2026)
- [CHANGELOG_2026_06_12.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_12.md)
- [CHANGELOG_2026_06_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_11.md)
- [CHANGELOG_2026_06_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_09.md)
- [CHANGELOG_2026_06_06.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_06.md)
- [CHANGELOG_2026_06_05.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_05.md)
- [CHANGELOG_2026_06_04.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_04.md)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_29.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_29.md)
- [CHANGELOG_2026_05_28.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_28.md)
- [CHANGELOG_2026_05_27.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_27.md)
- [CHANGELOG_2026_05_26.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_26.md)
- [CHANGELOG_2026_05_25.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_25.md)
- [CHANGELOG_2026_05_21.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_21.md)
- [CHANGELOG_2026_05_20.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_20.md)
- [CHANGELOG_2026_05_19.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_19.md)
- [CHANGELOG_2026_05_18.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_18.md)
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
*อัปเดตล่าสุด: 15-Jun-2026 14:24*
