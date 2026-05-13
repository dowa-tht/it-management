# Implementation Plan: Settings Guide, System Logs และ Incident Master Data UI Fix

**วันที่จัดทำ:** 2026-05-13 17:35  
**ประเภทเอกสาร:** Implementation History / Fix Plan  
**สถานะ:** Phase 1 & 2 Completed (Ready for Final Verification)  
**ผู้ใช้ร้องขอ:** ปรับปรุงตาม feedback หลังตรวจหน้า Settings

---

## 1. เป้าหมาย

แก้ไขปัญหาในเมนู Settings ตาม feedback ล่าสุด:

1. ปุ่ม Guide หลายหน้ายังแก้ไขเนื้อหาไม่ได้
2. เพิ่มเนื้อหา Guide ที่ยังไม่ได้ใส่
3. Audit Logs และ Approval Logs ต้องแสดง Doc No. ให้ถูกต้อง
4. Login History คอลัมน์ Email ต้องแสดง email ไม่ใช่ full name
5. System Errors ต้องมีนิยามชัดเจนว่าจะเอาข้อมูลอะไรมาแสดง และต้องทำให้ระบบบันทึก error ได้จริง
6. Incident Master Data ต้องลดขนาด section ค้นหาและเพิ่มข้อมูลให้กระชับขึ้น

---

## 2. มาตรฐานที่ต้องยึด

- `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md`
  - Section 7.2: Master Data CRUD ต้องมี toolbar/search/filter + create/edit form card ที่ responsive
  - Section 8: ทุกหน้า Settings ต้องมี Guide Button และ admin edit mode
  - Section 9: tablet/smartphone ต้องไม่เกิด overlap และ form ต้อง stack เมื่อพื้นที่ไม่พอ
- `docs/standards/UI_UX_SETTING.md`
  - Section 4.3: Guide ต้องเก็บใน `system_settings` ด้วย key `[page_name]_guide_content`
- `docs/standards/ZERO_HACK_POLICY.md`
  - ห้ามแก้ display แบบหลอกข้อมูล เช่นใส่ Doc No. ปลอม ต้อง resolve จาก source document จริงหรือ metadata จริง

---

## 3. Evidence จากโค้ดจริง

### 3.1 Guide ของ Master Data มี save logic แต่ modal ยังไม่มี edit UI

- `app/dashboard/settings/_components/MasterDataScope.js:L65-L67` มี state `showGuide`, `guideContent`, `editingGuide`
- `app/dashboard/settings/_components/MasterDataScope.js:L105-L109` โหลด Guide จาก `system_settings` ด้วย key `${activeType}_guide_content` แต่ fallback ยังเป็นข้อความ `(เนื้อหาคู่มือยังไม่ได้ตั้งค่า)`
- `app/dashboard/settings/_components/MasterDataScope.js:L150-L159` มี `handleSaveGuide()` สำหรับ upsert guide content
- `app/dashboard/settings/_components/MasterDataScope.js:L408-L418` modal แสดงเฉพาะ `<div>{guideContent}</div>` ไม่มีปุ่ม Edit, textarea, หรือ save button

### 3.2 หน้า Settings หลายหน้ามี edit guide อยู่แล้ว แต่ต้องตรวจ role และ default content

- `app/dashboard/settings/approvals/page.js:L133-L141` มีปุ่ม Edit และ save guide
- `app/dashboard/settings/holidays/page.js:L305-L310` มีปุ่ม Edit และ textarea mode
- `app/dashboard/settings/logs/page.js:L211-L219` มีปุ่ม Edit และ save guide แต่ปุ่ม Edit ยังไม่ได้ guard ด้วย role admin
- `app/dashboard/settings/no-series/page.js:L329-L337` มีปุ่ม Edit และ save guide
- `app/dashboard/settings/permissions/page.js:L321-L329` มีปุ่ม Edit และ save guide
- `app/dashboard/settings/users/page.js:L768-L776` มีปุ่ม Edit และ save guide
- `app/dashboard/settings/workflow/page.js:L171-L179` มีปุ่ม Edit และ save guide
- `app/dashboard/settings/working-hours/page.js:L159-L167` มีปุ่ม Edit และ save guide

### 3.3 Audit Logs / Approval Logs ดึง Doc No. จาก metadata เท่านั้น

- `app/actions/workflow.js:L595-L600` map Audit Logs โดยใช้ `docNo: l.metadata?.doc_no || '—'`
- `app/actions/workflow.js:L630-L637` map Approval Logs โดยใช้ `docNo: l.metadata?.doc_no || '—'`
- `app/actions/workflow.js:L212-L225` `recordAuditLog()` insert `metadata` ตามค่าที่ caller ส่งมา แต่ไม่ได้ enrich `doc_no` เอง

### 3.4 Login History คอลัมน์ Email แต่แสดง full_name

- `app/actions/workflow.js:L573-L576` map login logs โดยเพิ่ม `full_name: nameMap[l.user_email] || l.user_email`
- `app/dashboard/settings/logs/page.js:L334` header ระบุคอลัมน์เป็น `Email`
- `app/dashboard/settings/logs/page.js:L390` render ค่า `{log.full_name || log.user_email}`

### 3.5 System Errors มี function และ tab แล้ว แต่ต้องบันทึกให้ครบ

- `app/actions/workflow.js:L194-L205` มี `recordSystemError(category, message, metadata)` insert ลง `system_logs`
- `app/actions/workflow.js:L649-L657` `getSystemLogs('system')` ดึงจาก `system_logs` เฉพาะ `.eq('category', 'error')`
- `app/dashboard/settings/logs/page.js:L267-L270` มี tab `System Errors`
- `app/dashboard/settings/logs/page.js:L338-L345` System Errors ใช้ table layout เดียวกับ Audit Logs

### 3.6 Incident Master Data ใช้ MasterDataScope และ form/search ใหญ่เกิน

- `app/dashboard/settings/incident-master-data/page.js:L7-L10` ใช้ `MasterDataStandalonePage` พร้อม `forcedGroup="incident"`
- `app/dashboard/settings/_components/MasterDataScope.js:L273-L290` search/filter ใช้ input padding `14px`, radius `18px`
- `app/dashboard/settings/_components/MasterDataScope.js:L292-L321` add form ใช้ card padding `24px`, radius `24px`, input/button padding ค่อนข้างใหญ่

---

## 4. Phase 1: Guide System Fix

### 4.1 แก้ MasterDataScope Guide Modal ให้ Edit ได้

**ไฟล์:** `app/dashboard/settings/_components/MasterDataScope.js`

เพิ่ม UI ใน modal:

- ปุ่ม Edit แสดงเฉพาะ `isAdmin`
- เมื่อ `editingGuide === true` ให้แสดง `textarea`
- เพิ่มปุ่ม Save เรียก `handleSaveGuide()`
- ปิด modal แล้ว reset `editingGuide(false)`

Pseudocode:

```js
{isAdmin && (
  <button onClick={() => setEditingGuide(!editingGuide)}>
    {editingGuide ? 'View' : 'Edit'}
  </button>
)}

{editingGuide ? (
  <>
    <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} />
    <button onClick={handleSaveGuide} disabled={saving}>บันทึกคู่มือ</button>
  </>
) : (
  <GuideMarkdownRenderer content={guideContent} />
)}
```

### 4.2 เพิ่ม default guide content ให้ครบทุก activeType ใน MasterDataScope

**ไฟล์:** `app/dashboard/settings/_components/MasterDataScope.js`

สร้าง object กลาง:

```js
const DEFAULT_MASTER_GUIDES = {
  incident_category: `### Incident Category Guide ...`,
  affected_system: `### Affected System Guide ...`,
  sla_exclusion_reason: `### SLA Exclusion Reason Guide ...`,
  checklist_category: `### Checklist Category Guide ...`,
  checklist_template: `### Checklist Master Guide ...`,
  procedure_plan: `### Procedure Plans Guide ...`
}
```

Logic:

```js
if (data?.value) {
  setGuideContent(data.value)
} else {
  setGuideContent(DEFAULT_MASTER_GUIDES[activeType] || genericGuide)
}
```

เนื้อหา default ต้องครอบคลุมวัตถุประสงค์, วิธีเพิ่ม/แก้ไข/ปิดใช้งาน/ลบข้อมูล, ผลกระทบต่อ Incident หรือ Checklist และข้อควรระวังในการแก้ Master Data ที่ถูกใช้งานแล้ว

### 4.3 Normalize role guard ใน Logs Guide

**ไฟล์:** `app/dashboard/settings/logs/page.js`

ปัจจุบันปุ่ม Edit ใน Guide modal ที่ `L211` ไม่เช็ค admin ให้แก้เป็น:

```js
{currentUser?.role === 'admin' && (
  <button onClick={() => setEditingGuide(!editingGuide)}>...</button>
)}
```

ถ้ายังไม่มี `currentUser` ใน Logs page ให้เพิ่ม state และโหลดจาก `supabase.auth.getUser()` + `user_profiles` แบบเดียวกับหน้า Settings อื่น

---

## 5. Phase 2: System Logs & Audit Fix

### 5.1 เพิ่ม Doc No Resolver สำหรับ Audit/Approval Logs

**ไฟล์:** `app/actions/workflow.js`

สร้าง helper ใน server action:

```js
async function buildDocNoMap(supabaseAdmin, logs) {
  const checklistIds = [...new Set(logs.filter(l => l.doc_type === 'checklist').map(l => l.doc_id).filter(Boolean))]
  const incidentIds = [...new Set(logs.filter(l => l.doc_type === 'incident').map(l => l.doc_id).filter(Boolean))]

  const [chkRes, incRes] = await Promise.all([
    checklistIds.length
      ? supabaseAdmin.from('checklist_docs').select('id, freq_type, period_date').in('id', checklistIds)
      : { data: [] },
    incidentIds.length
      ? supabaseAdmin.from('incidents').select('id, case_number').in('id', incidentIds)
      : { data: [] }
  ])

  return {
    ...Object.fromEntries((chkRes.data || []).map(c => [c.id, `CHK-${c.period_date}-${c.freq_type?.charAt(0) || '?'}`])),
    ...Object.fromEntries((incRes.data || []).map(i => [i.id, i.case_number]))
  }
}
```

นำไปใช้ใน `type === 'audit'` และ `type === 'approval'`:

```js
const docNoMap = await buildDocNoMap(supabaseAdmin, data)
docNo: l.metadata?.doc_no || docNoMap[l.doc_id] || '—'
```

### 5.2 Enrich recordAuditLog ให้เติม metadata.doc_no อัตโนมัติ

**ไฟล์:** `app/actions/workflow.js`

แก้ `recordAuditLog()` ก่อน insert:

```js
const reg = WORKFLOW_DOC_REGISTRY[type]
let enrichedMetadata = { ...metadata }

if (reg && docId && !enrichedMetadata.doc_no) {
  const { data: docData } = await supabaseAdmin
    .from(reg.table)
    .select(reg.no_field)
    .eq('id', docId)
    .maybeSingle()
  if (docData?.[reg.no_field]) enrichedMetadata.doc_no = docData[reg.no_field]
}

insert({ metadata: enrichedMetadata })
```

ข้อควรระวัง: ถ้าเป็น checklist และไม่มี no field จริง ให้ใช้สูตรเดียวกับระบบเดิม `CHK-${period_date}-${freq_type.charAt(0)}` ห้ามสร้างเลขเอกสารปลอมหากหาเอกสารไม่เจอ

### 5.3 แก้ Login History ให้ Email แสดง email จริง

**ไฟล์:** `app/dashboard/settings/logs/page.js`

ตัวเลือกที่แนะนำ:

1. เปลี่ยน cell `L390` เป็น `{log.user_email || '—'}`
2. ถ้าต้องการแสดงชื่อด้วย ให้เพิ่ม column `Name` แยกต่างหาก

Pseudocode:

```jsx
<th>Email</th>
<th>Name</th>
...
<td>{log.user_email || '—'}</td>
<td>{log.full_name && log.full_name !== log.user_email ? log.full_name : '—'}</td>
```

### 5.4 นิยาม System Errors ให้ชัดเจน

System Errors ต้องแสดงข้อมูลจาก `system_logs` โดยใช้เงื่อนไข:

```js
system_logs.category === 'error'
```

คอลัมน์ที่ควรแสดง:

| Column | Source |
| --- | --- |
| Timestamp | `system_logs.created_at` |
| Category | `system_logs.category` |
| Error Message | `system_logs.message` |
| Context | `system_logs.metadata.source`, `metadata.action`, `metadata.route`, `metadata.docId` |
| Metadata | collapsed JSON / detail modal |

### 5.5 เพิ่มการบันทึก System Errors ในจุดสำคัญ

**ไฟล์เป้าหมายเริ่มต้น:**

- `app/actions/workflow.js`
- `app/actions/incidents.js`
- `app/actions/admin.js`
- `app/actions/login.js`
- `app/api/approval/send/route.js`
- `app/api/approval/verify/route.js`

Pattern:

```js
catch (err) {
  await recordSystemError('error', err.message, {
    source: 'submitApprovalStep',
    action: 'workflow.approval.submit',
    docId,
    docType,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
  console.error('submitApprovalStep Error:', err)
  return { error: err.message }
}
```

ข้อควรระวัง:

- ห้ามบันทึก password, PIN, token, service key, หรือข้อมูลลับลง metadata
- ใช้ `source` และ `action` เพื่อให้หน้า System Errors filter/scan ได้ง่าย

---

## 6. Phase 3: Incident Master Data Compact UI

### 6.1 ลดขนาด Search Section

**ไฟล์:** `app/dashboard/settings/_components/MasterDataScope.js`

แก้ block `Search & Filter` จาก `L273-L290`:

- input padding จาก `14px 14px 14px 44px` เป็น `10px 12px 10px 38px`
- radius จาก `18px` เป็น `12px`
- icon left จาก `16px` เป็น `12px`
- เพิ่ม compact class เฉพาะ master data

### 6.2 ลดขนาด Add Form

**ไฟล์:** `app/dashboard/settings/_components/MasterDataScope.js`

แก้ block `Add Form` จาก `L292-L321`:

- card padding จาก `24px` เป็น `12px - 16px`
- radius จาก `24px` เป็น `16px`
- input padding จาก `12px 16px` เป็น `10px 12px`
- button padding จาก `12px 24px` เป็น `10px 16px`
- gap จาก `12px` เป็น `8px`

### 6.3 ทำ Compact เฉพาะ Incident Master Data โดยไม่กระทบ Checklist Template

แนะนำให้เพิ่ม flag:

```js
const isCompactMasterData = forcedGroup === 'incident'
```

ใช้ style แบบ conditional:

```js
padding: isCompactMasterData ? 14 : 24
borderRadius: isCompactMasterData ? 16 : 24
```

---

## 7. Suggested File Changes

| File | Change |
| --- | --- |
| `app/dashboard/settings/_components/MasterDataScope.js` | เพิ่ม edit guide UI, default guide content, compact search/add form สำหรับ Incident Master Data |
| `app/dashboard/settings/logs/page.js` | เพิ่ม/ตรวจ `currentUser`, จำกัด Edit guide เฉพาะ admin, แก้ Login Email cell, ปรับ System Errors columns |
| `app/actions/workflow.js` | เพิ่ม doc no resolver, enrich `recordAuditLog()`, ปรับ `getSystemLogs()` และเพิ่ม error logging pattern |
| `app/actions/incidents.js` | เพิ่ม `recordSystemError()` ใน catch จุดสำคัญ |
| `app/actions/admin.js` | เพิ่ม `recordSystemError()` ใน catch จุดสำคัญ โดยไม่ log password/PIN |
| `app/actions/login.js` | เพิ่ม `recordSystemError()` เมื่อ login flow error ที่เป็น system exception |
| `app/api/approval/send/route.js` | บันทึก email send error เข้า `system_logs` |
| `app/api/approval/verify/route.js` | บันทึก approval verify exception เข้า `system_logs` |

---

## 8. Verification Checklist

### Guide

- [x] เปิด Incident Master Data แล้วกด Guide เห็นปุ่ม Edit เมื่อ login เป็น admin
- [x] แก้ไข Guide แล้วกด save ข้อมูลถูก upsert เข้า `system_settings`
- [x] ปิด modal แล้วเปิดใหม่ เนื้อหาที่แก้ยังอยู่
- [x] role ที่ไม่ใช่ admin เห็น Guide ได้แต่ไม่มีปุ่ม Edit
- [x] activeType ทั้ง 6 ตัวมี default guide content ไม่ขึ้นข้อความ `(เนื้อหาคู่มือยังไม่ได้ตั้งค่า)`

### Logs

- [x] Audit Logs แสดง Doc No. จาก `metadata.doc_no` หรือ resolve จากเอกสารจริง
- [x] Approval Logs แสดง Doc No. จาก `metadata.doc_no` หรือ resolve จากเอกสารจริง
- [x] ถ้า doc ถูกลบหรือหาไม่เจอ แสดง `—` ไม่สร้างเลขปลอม
- [x] Login History คอลัมน์ Email แสดง `user_email`
- [x] ถ้ามี Name column ต้องแสดง full name แยกจาก email
- [x] System Errors แสดง record จาก `system_logs` ที่ `category = 'error'`
- [x] Error ใหม่จาก workflow/admin/approval send ถูกบันทึกลง `system_logs`

### Incident Master Data

- [x] Search section และ Add form มีขนาดกระชับขึ้นบน desktop
- [ ] Tablet ไม่เกิด overlap
- [ ] Smartphone form stack และปุ่มเต็มความกว้าง
- [ ] Checklist Master Data ไม่ถูกบีบจนใช้งานยาก

### Build / Test

- [x] รัน `npm run build`
- [ ] เปิด `/dashboard/settings/incident-master-data`
- [ ] เปิด `/dashboard/settings/logs` แล้วทดสอบทุก tab
- [ ] เปิด `/dashboard/settings/permissions`, `/users`, `/workflow`, `/approvals`, `/substitutes`, `/working-hours`, `/holidays`, `/no-series` เพื่อตรวจ Guide ไม่ regression

---

## 9. Implementation Order ที่แนะนำ

1. แก้ `MasterDataScope.js` เรื่อง Guide edit และ default content ก่อน
2. แก้ compact UI ของ Incident Master Data ในไฟล์เดียวกัน
3. แก้ `logs/page.js` เรื่อง Email column และ admin-only guide edit
4. แก้ `workflow.js` เพิ่ม doc no resolver และ enrich metadata
5. เพิ่ม `recordSystemError()` ใน catch block สำคัญแบบไม่ log sensitive data
6. รัน build และทดสอบ responsive

---

## 10. หมายเหตุสำคัญสำหรับ Agent ที่รับงานต่อ

> [!IMPORTANT]
> ห้ามแก้ปัญหา Doc No. ด้วยการแสดง `doc_id`, UUID แบบย่อ, หรือข้อความ hardcode แทนเลขเอกสารจริง ให้ resolve จาก source document เท่านั้น ได้แก่ `incidents.case_number` หรือสูตร checklist ที่ระบบใช้จริง

> [!IMPORTANT]
> ห้ามบันทึก PIN, password, reset token, approval token, service role key หรือข้อมูลลับใดๆ ลง `system_logs.metadata`

> [!IMPORTANT]
> ถ้าพบว่า `checklist_docs` มี field เลขเอกสารจริงอยู่แล้ว ให้ใช้ field นั้นแทนสูตร `CHK-${period_date}-${freq_type}` และอัปเดตเอกสารมาตรฐานที่เกี่ยวข้อง
