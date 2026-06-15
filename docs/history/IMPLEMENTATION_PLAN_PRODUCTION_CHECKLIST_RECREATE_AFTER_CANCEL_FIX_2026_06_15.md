# Production Checklist Recreate-After-Cancel Fix Plan (15-Jun-2026)

## Release Scope

release นี้แก้เฉพาะกติกาการสร้าง Checklist ใหม่ในกรณีที่มีเอกสารเดิมของรอบเดียวกันถูก `Cancelled` ไปแล้ว แต่ยังไม่มีการตรวจจริงเกิดขึ้น

## Business Rule Target

กำหนดมาตรฐานใหม่ให้ตรงกันทั้ง dev และ production:

1. `Cancelled + untouched` ต้องถือว่า "ว่าง"
2. `Cancelled + touched` ยังถือว่า "ถูกใช้แล้ว"
3. เอกสารที่ยัง `Open`, `In Progress`, `Pending Approval`, `Closed` ยัง block การสร้างซ้ำตามเดิม

## In-Scope Files

1. `app/dashboard/checklist/page.js`
2. `lib/checklistPeriodUsage.js`
3. `tests/checklist-period-usage.test.js`

## Out of Scope

1. ไม่แก้ schema database
2. ไม่ลบเอกสาร `Cancelled` เดิมออกจาก production
3. ไม่เปลี่ยน running number policy
4. ไม่แก้ workflow/cancel flow ของ incident

## Root Cause

logic เดิมของหน้า create checklist ใช้เพียง `checklist_items.item_key` ในรอบเวลานั้นเพื่อสรุปว่า item ถูกใช้ไปแล้ว โดยไม่สน `status` ของเอกสารแม่ จึงทำให้:

1. เอกสาร `Cancelled` ที่ยัง untouched
2. แต่ยังมี `checklist_items` ค้างอยู่

ถูกตีความผิดว่า "ตรวจไปแล้ว"

## Fix Strategy

ย้ายกติกาไป helper กลาง `lib/checklistPeriodUsage.js`:

1. ถ้าเอกสารเป็น `Cancelled`
2. และ items ทุกตัวของเอกสารนั้นยัง `status = null`

ให้ไม่นับ item keys ของเอกสารนั้นเป็น `usedKeys`

## Verification

ยืนยันใน development source แล้วว่า:

1. `npm test` ผ่าน 37/37
2. `npm run build` ผ่าน
3. unit tests ใหม่ครอบคลุม:
   - ignored cancelled untouched docs
   - kept touched cancelled docs
   - kept active docs

## Production Target

1. Repo: `dowa-tht/it-management`
2. Database: `yrgsukhjkoexvdybyyjm`

## Migration Files

ไม่มี database migration ใน release นี้

## Rollback Plan

ถ้าหลัง deploy พบ regression:

1. revert production repo กลับ commit ก่อนหน้า
2. redeploy
3. re-check create modal ของ checklist
4. ตรวจว่า active/open docs ยัง block duplicate ได้ตามเดิม

## Post-Release Verification

1. เปิด production `/dashboard/checklist`
2. กดสร้าง Daily ของ `15-Jun-2026`
3. ต้องเห็นรายการจากเอกสาร `Cancelled` เดิมกลับมาเป็น `ว่าง`
4. ต้องสามารถสร้างเอกสารใหม่ได้
5. ถ้ามีเอกสาร active ของรอบเดียวกันอยู่จริง รายการนั้นยังต้องถูก block ตามเดิม

## Execution Result

รอ update หลัง promote ขึ้น production repo และยืนยันผล
