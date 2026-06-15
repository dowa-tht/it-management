# Production Checklist Cancel Fix Release Plan (15-Jun-2026)

## Release Scope

production release นี้แก้เฉพาะอาการที่หน้า Checklist Detail กดยกเลิกเอกสารแล้วล้มด้วย error:

```text
column checklist_docs.reported_by_id does not exist
```

## In-Scope Code Files

1. `app/actions/workflow.js`
2. `tests/incident-otp-flow.test.js`

## Out of Scope

1. ไม่แก้ schema ของ `checklist_docs`
2. ไม่เพิ่ม column `reported_by_id` ให้ checklist
3. ไม่แก้ incident cancel verification policy
4. ไม่แตะ flow create checklist หรือ no-series เพิ่มเติม

## Root Cause Summary

1. `cancelDocument()` ใช้ query กลางร่วมกันทุก document type
2. query เดิม hardcode reporter fields แบบ incident-only:
   - `reported_by_id`
   - `reporter_email`
   - `reported_by`
   - `created_by_id`
3. ตาราง `checklist_docs` ไม่มี `reported_by_id`
4. production จึงล้มตั้งแต่ query เริ่มทำงาน ก่อนเข้า permission logic ของ checklist

## Standard Alignment

สอดคล้องกับ:

1. `docs/standards/WINDSURF.md`
2. `docs/standards/WORKFLOW_ENGINE.md`

## Code Change

ใน `app/actions/workflow.js`

จากเดิม:

```js
.select(`*, reported_by_id, reporter_email, reported_by, created_by_id, ${reg.no_field}`)
```

เป็น:

```js
.select('*')
```

## Verification Before Release

ยืนยันแล้วบน release source:

1. `npm test` ผ่าน
2. `npm run build` ผ่าน
3. เพิ่ม regression test ป้องกันการ hardcode reporter fields กลับเข้ามาอีก

## Production Target

1. Repo: `dowa-tht/it-management`
2. Database: `yrgsukhjkoexvdybyyjm`

## Migration File List

ไม่มี database migration ใน release นี้

## Rollback Plan

ถ้าหลังปล่อยพบ regression:

1. revert production repo กลับ commit ก่อนหน้า
2. redeploy บน Vercel
3. ทดสอบ checklist cancel และ incident cancel smoke test ซ้ำ

## Post-Release Verification

1. เปิด production `/dashboard/checklist`
2. เปิดเอกสาร checklist ที่ยังเป็น `Open`
3. กรอกเหตุผลแล้วยืนยันยกเลิก
4. ต้องไม่ขึ้น error `column checklist_docs.reported_by_id does not exist`
5. เอกสารต้องเปลี่ยนสถานะเป็น `Cancelled`

## Execution Result

รอ update หลัง sync production repo และยืนยัน deployment สำเร็จ
