# Production Checklist Cancel + No. Series Reset Fix (15-Jun-2026)

## Scope
- แก้ production schema drift ที่ทำให้ `cancelDocument()` ยกเลิกเอกสารสำเร็จแต่ toast error เพราะ `approval_tokens.revoked_at` ไม่มีใน production
- ปรับ runtime contract ของ `CHK` no-series ให้ `starting_no` ของ active line มีผลจริงเมื่อ line นั้นยังไม่เคยใช้เลข
- reset production data ของ `CHK` line สำหรับรอบ `2026-06` ให้เริ่มที่ `DTT-CHK-2606-001` เพื่อให้ผู้ใช้ทดสอบสร้างเอกสารใหม่ได้ทันที

## Root Cause
1. `app/actions/workflow.js` เรียก `revokeApprovalTokens()` หลัง cancel สำเร็จ โดย update `approval_tokens.revoked_at`
2. production database ยังไม่มี column/group ของ public approval token runtime contract แม้ source code ฝั่ง dev ใช้งานไปแล้ว
3. `lib/noSeries.js` เดิมใช้เอกสารล่าสุดในตารางเป็นฐานก่อน `starting_no` ทำให้การ delete/create line ใหม่เพื่อ reset เดือน ไม่สามารถบังคับเลขเริ่มต้นตาม setup ได้

## Change Set
- `supabase/migrations/20260615_fix_approval_tokens_runtime_contract.sql`
  - เติมคอลัมน์และ index ที่ runtime public approval ใช้อยู่ (`token_hash`, `consumed_at`, `session_hash`, `revoked_at`, ...)
- `lib/noSeriesRuntime.js`
  - helper กลางสำหรับคำนวณ next number แบบ pure
- `lib/noSeries.js`
  - ให้ `starting_no` ของ active line override persisted doc history ได้ เมื่อ line นั้นยังไม่มี `last_no_used`
- `tests/no-series-runtime.test.js`
  - regression tests สำหรับ reset behavior ของ `starting_no`

## Production Data Repair
- target line: `no_series_lines.series_code = 'CHK'` และ `starting_date = '2026-06-01'`
- target values:
  - `starting_no = 'DTT-CHK-2606-001'`
  - `last_no_used = NULL`
  - `last_date_used = NULL`
- header sync:
  - `no_series.code = 'CHK'`
  - `last_no_used = NULL`
  - `last_date_used = NULL`

หมายเหตุ:
- historical docs `DTT-CHK-2606-003/004/005` ยังคงเก็บไว้เป็น audit trail
- runtime ใหม่จะเริ่มจาก `starting_no` เพราะ line ถูก reset และยังไม่มี `last_no_used`

## Verification
1. `npm test` ต้องผ่าน 100%
2. `npm run build` ต้องผ่าน
3. production schema probe:
   - `approval_tokens?select=id,revoked_at&limit=1` ต้องไม่ error
4. production no-series probe:
   - `no_series_lines` ของ `CHK` ต้องมี `starting_no = DTT-CHK-2606-001`
   - `last_no_used = null`
5. production next-number expectation:
   - preview/creation ของ `CHK` รอบ `2026-06` ต้องได้ `DTT-CHK-2606-001`
6. smoke test:
   - ยกเลิก checklist ต้องไม่ขึ้น toast error เรื่อง `approval_tokens.revoked_at`

## Rollback
- schema columns เป็น additive migration จึงไม่ rollback ระดับ DDL ในรอบนี้
- หาก no-series reset ให้ผลไม่ตรงตามธุรกิจ:
  - restore `no_series.last_no_used = 'DTT-CHK-2606-005'`
  - restore `no_series_lines.last_no_used = 'DTT-CHK-2606-005'`
  - clear `starting_no` ของ line เดือน `2026-06`
