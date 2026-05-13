# Implementation Plan: Settings Route Separation

**Created:** 2026-05-13 16:40  
**Status:** COMPLETED (2026-05-13)  
**Scope:** เอา `Master Data` wrapper ออกจากเมนู Settings และแยก route ของแต่ละกลุ่ม Setting ให้เป็นหน้าอิสระที่ชัดเจน

---

## 1. Background

หลังจากจัด Sidebar Settings เป็นกลุ่มหลักแล้ว ยังพบปัญหาว่าบางเมนูยังชี้เข้า route กลางแบบ query param เช่น:

```text
/dashboard/settings/master-data?type=holidays
/dashboard/settings/master-data?group=incident
/dashboard/settings/master-data?group=checklist
```

ผลคือ UI ดูเหมือนอยู่ในเมนู `System Setup > Holidays` หรือ `Master Data > Incident Master Data` แต่ content กลางยังแสดงโครงสร้าง `Master Data & Settings` และมี sidebar ย่อยซ้อนอยู่ ทำให้ผู้ใช้สับสนว่ากำลังอยู่ในหมวดใดกันแน่

---

## 2. Goal

1. เลิกใช้ `master-data?group=...` และ `master-data?type=...` เป็น route หลักจาก Sidebar
2. แยก route จริงตามเมนูที่ผู้ใช้เห็น
3. ให้แต่ละหน้าแสดง header, guide, form, table และ action ของตัวเองอย่างชัดเจน
4. เก็บ `/dashboard/settings/master-data` เป็น legacy fallback เท่านั้น ไม่ใช่ entry point หลัก
5. อัปเดต permission map ให้ route ใหม่ทั้งหมดมี access rule ชัดเจน

---

## 3. Target Route Structure

```text
/dashboard/settings
├─ system setup
│  ├─ /no-series
│  ├─ /working-hours
│  └─ /holidays
│
├─ master data
│  ├─ /incident-master-data
│  └─ /checklist-master-data
│
├─ workflow & approval
│  ├─ /workflow
│  ├─ /approvals
│  └─ /substitutes
│
├─ users & access
│  ├─ /users
│  └─ /permissions
│
└─ audit & logs
   └─ /logs
```

---

## 4. Route Migration Matrix

| Current Route | New Route | Action |
|---|---|---|
| `/dashboard/settings/master-data?type=holidays` | `/dashboard/settings/holidays` | Create standalone Holidays page and update Sidebar |
| `/dashboard/settings/master-data?group=incident` | `/dashboard/settings/incident-master-data` | Create standalone route using Incident-only master data scope |
| `/dashboard/settings/master-data?group=checklist` | `/dashboard/settings/checklist-master-data` | Create standalone route using Checklist-only master data scope |
| `/dashboard/settings/master-data` | Legacy fallback | Keep route but remove from Sidebar |

---

## 5. File-Level Implementation Plan

### 5.1 `app/dashboard/layout.js`

Update `settingsGroups` so every Settings item points to a real route:

```javascript
System Setup:
  Holidays -> /dashboard/settings/holidays

Master Data:
  Incident Master Data -> /dashboard/settings/incident-master-data
  Checklist Master Data -> /dashboard/settings/checklist-master-data
```

Auto-expand logic:

```javascript
if pathname includes '/holidays':
  expandedSection = 'system_setup'
else if pathname includes '/incident-master-data' or '/checklist-master-data':
  expandedSection = 'master_data'
```

### 5.2 `app/dashboard/settings/holidays/page.js`

Create standalone Holidays page by moving Holidays behavior out of `master-data/page.js`.

Required functions:

```text
fetchItems()
fetchGuide()
handleSaveGuide()
handleAddHoliday()
handleUpdateHoliday()
handleDelete()
handleImportCSV()
downloadCSVTemplate()
```

Required UI:

```text
Header: Holidays + Guide button
Toolbar: Template + Import CSV
Filters: Search + Month filter
Form: Date + Description + Add button
Table: Date / Description / Actions
Guide Modal: holidays_guide_content
```

### 5.3 `app/dashboard/settings/incident-master-data/page.js`

Create route that renders only Incident master data:

```text
Incident Category
Affected System
SLA Exclusion Reason
```

Implementation approach:

```javascript
<MasterDataStandalonePage
  forcedGroup="incident"
  initialType="incident_category"
  title="Incident Master Data"
/>
```

### 5.4 `app/dashboard/settings/checklist-master-data/page.js`

Create route that renders only Checklist master data:

```text
Checklist Category
Checklist Master
Procedure Plans
```

Implementation approach:

```javascript
<MasterDataStandalonePage
  forcedGroup="checklist"
  initialType="checklist_category"
  title="Checklist Master Data"
/>
```

### 5.5 `app/dashboard/settings/master-data/page.js`

Refactor this file from a universal wrapper into a reusable scoped component.

Required changes:

```text
Export MasterDataStandalonePage
Keep only Incident Setup and Checklist Setup in MASTER_GROUPS
Remove General Setup from MASTER_GROUPS
Remove Workflow Setup from MASTER_GROUPS
Do not show Holidays in this page
Do not use this route in Sidebar
```

Legacy route behavior:

```javascript
export default function MasterDataPage() {
  return <MasterDataStandalonePage forcedGroup="incident" />
}
```

### 5.6 `lib/auth.js`

Add explicit route permissions:

```javascript
'/dashboard/settings/incident-master-data': ['admin']
'/dashboard/settings/checklist-master-data': ['admin']
'/dashboard/settings/holidays': ['admin']
'/dashboard/settings/workflow': ['admin']
'/dashboard/settings/permissions': ['admin']
```

---

## 6. Technical Logic

### 6.1 Sidebar Path Resolution

```text
IF pathname startsWith /dashboard/settings/holidays
  active group = system_setup
  active item = Holidays

ELSE IF pathname startsWith /dashboard/settings/incident-master-data
  active group = master_data
  active item = Incident Master Data

ELSE IF pathname startsWith /dashboard/settings/checklist-master-data
  active group = master_data
  active item = Checklist Master Data

ELSE IF pathname startsWith /dashboard/settings/master-data
  active group = master_data
  active item = none or legacy fallback
```

### 6.2 Master Data Scope

```text
IF forcedGroup == incident
  visibleGroups = ['Incident Setup']
  initialType = incident_category

IF forcedGroup == checklist
  visibleGroups = ['Checklist Setup']
  initialType = checklist_category

IF no forcedGroup
  legacy fallback defaults to incident
```

### 6.3 Holidays Data Flow

```text
On page load:
  fetch holidays ordered by holiday_date desc
  fetch system_settings where key = holidays_guide_content
  fetch current user profile for guide edit permission

On add:
  validate date and description
  normalize date to YYYY-MM-DD
  insert into holidays
  refresh table

On edit:
  update holidays set holiday_date, description where id
  refresh table

On delete:
  confirm deletion
  delete from holidays where id
  refresh table
```

---

## 7. Acceptance Criteria

1. Sidebar no longer contains any `href` using `/dashboard/settings/master-data?`
2. `Holidays` opens `/dashboard/settings/holidays`
3. `Incident Master Data` opens `/dashboard/settings/incident-master-data`
4. `Checklist Master Data` opens `/dashboard/settings/checklist-master-data`
5. Holidays page does not show `Master Data & Settings` header
6. Incident Master Data page only shows Incident Setup sidebar items
7. Checklist Master Data page only shows Checklist Setup sidebar items
8. `npm run build` passes
9. Route permission map includes all new routes
10. Documentation and changelog are updated after implementation

---

## 8. Verification Checklist

```text
[ ] rg "master-data\\?" app/dashboard/layout.js returns no result
[ ] npm run build passes
[ ] Next route list includes:
    - /dashboard/settings/holidays
    - /dashboard/settings/incident-master-data
    - /dashboard/settings/checklist-master-data
[ ] Browser check: Holidays page header is "Holidays"
[ ] Browser check: no nested General Setup card appears in Holidays
[ ] Browser check: Incident route shows Incident Setup only
[ ] Browser check: Checklist route shows Checklist Setup only
```

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Existing bookmarks to `master-data?type=holidays` still exist | Low | Keep legacy route available but remove from Sidebar |
| Reusing `MasterDataStandalonePage` imports a page component from another route | Medium | Prefer extracting shared component later if code grows |
| Holidays logic duplication during transition | Medium | Remove Holidays-specific code from `master-data/page.js` in cleanup phase |
| Browser verification blocked by local policy | Low | Use `npm run build` and code evidence, then ask user to visually confirm local page |

---

## 10. Follow-Up Cleanup

หลัง route separation สำเร็จ ควรทำ cleanup เพิ่มเติม:

1. ย้าย shared master-data component ไปไว้ในไฟล์ private เช่น `app/dashboard/settings/_components/MasterDataScope.js`
2. ลบ unused Holidays logic ที่เหลือใน `master-data/page.js`
3. ลบ unused Working Hours logic ที่เหลือใน `master-data/page.js`
4. เพิ่ม Guide button ให้ `Permissions` และ `Workflow` หากยังไม่ครบตาม `UI_UX_SETTING.md`
5. อัปเดต `docs/standards/UI_UX_SETTING.md` ให้ระบุ taxonomy ใหม่ของ Settings เป็นมาตรฐานถาวร

