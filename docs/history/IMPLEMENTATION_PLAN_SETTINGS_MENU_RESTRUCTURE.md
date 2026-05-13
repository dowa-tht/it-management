# Implementation Plan: Settings Menu Restructure

**Created:** 2026-05-13 14:01  
**Status:** Implemented through route separation (2026-05-13 16:13)  
**Scope:** ปรับโครงสร้างเมนู Settings ให้แยกหมวดหมู่ตามงานของผู้ดูแลระบบ และลดความสับสนจากการรวมทุกอย่างไว้ใน Master Data

---

## 1. Problem Statement

โครงสร้าง Settings ปัจจุบันมีปัญหาหลักคือเมนูหลายประเภทถูกจัดรวมอยู่ใน `Master Data & Settings` แม้ว่าหน้าที่จริงจะต่างกัน เช่น Workflow, Working Hours, Approval Flows และ Substitute Approvers ไม่ใช่ Master Data แบบเดียวกับ Incident Category หรือ Checklist Category

หลักฐานจากโค้ดปัจจุบัน:

### **Phase 1: ปรับโครงสร้าง Sidebar (layout.js)**
**สถานะ: ✅ Completed**
- [x] แก้ไข `app/dashboard/layout.js`
- [x] เปลี่ยนจากรายการ Settings แบบ Flat เป็น Grouped (5 กลุ่ม)
- [x] เพิ่ม `settingsGroups` configuration
- [x] ปรับ `isActive` ให้รองรับ Query Parameters

### **Phase 2: จัดระเบียบหน้า Master Data และหน้าย่อย**
**สถานะ: ✅ Completed**
- [x] แก้ไข `app/dashboard/settings/master-data/page.js`
- [x] ลบหมวดหมู่ "Workflow Setup" และ "Working Hours"
- [x] เพิ่ม `Suspense` และ `useSearchParams`
- [x] เพิ่ม Logic แสดงผลตาม Query Param (`group`, `type`)
- [x] **New:** เพิ่ม Guide Button (📖) ให้หน้า Approvals, Substitutes, Working Hours

### **Phase 2.1: เอา Master Data Wrapper ออกจากเมนูหลัก**
**สถานะ: ✅ Completed**
- [x] เพิ่ม route แยก `/dashboard/settings/incident-master-data`
- [x] เพิ่ม route แยก `/dashboard/settings/checklist-master-data`
- [x] เพิ่ม route แยก `/dashboard/settings/holidays`
- [x] ปรับ Sidebar ให้เลิกใช้ `/dashboard/settings/master-data?group=...` และ `/dashboard/settings/master-data?type=...`
- [x] อัปเดต `lib/auth.js` ให้รู้จัก route ใหม่แบบ Admin-only
- [x] เก็บ `/dashboard/settings/master-data` เป็น legacy fallback โดยไม่ใช้เป็นเมนูหลัก

| Area | Evidence | Current Behavior |
|---|---|---|
| Sidebar Settings | `app/dashboard/layout.js` lines 128-132 | แสดงเมนูหลัก 5 รายการ: No. Series, Master Data, Users, System Logs, Permissions |
| Master Data groups | `app/dashboard/settings/master-data/page.js` lines 9-39 | รวม Incident Setup, Checklist Setup, General Setup และ Workflow Setup ไว้ในหน้าเดียว |
| Hidden routes | `app/dashboard/settings/*/page.js` | มี route อยู่จริงหลายหน้าแต่ไม่ถูกแสดงใน sidebar เช่น working-hours, workflow, approvals, substitutes |
| Permission guard | `app/dashboard/layout.js` lines 72-80 | ใช้ dynamic permission จาก feature key `settings` |
| Route permission map | `lib/auth.js` lines 37-43 | มี route permission บาง settings route แต่ไม่ครบทุก route ที่มีไฟล์จริง |

---

## 2. Goals

1. จัด Settings menu ให้เข้าใจง่ายตามประเภทงานของ Admin
2. แยก Master Data ออกจาก System Setup และ Workflow/Approval อย่างชัดเจน
3. ใช้ route เดิมให้มากที่สุดเพื่อลดความเสี่ยงของ regression
4. ทำให้เมนูที่มี route จริงสามารถเข้าถึงได้จาก UI
- **สถานะปัจจุบัน**: ✅ Phase 1-2.1 COMPLETED | Phase 3-4 IN PROGRESS
- **ผู้รับผิดชอบ**: Antigravity (AI Agent)
- **อ้างอิงมาตรฐาน**: `UI_UX_SETTING.md`, `PERMISSIONS.md`
- **วันที่มีผล**: 13 พฤษภาคม 2569
- **ความคืบหน้าล่าสุด**: 
    - ✅ ปรับปรุง Sidebar Grouping ใน `layout.js`
    - ✅ ลบความซ้ำซ้อนใน `master-data/page.js`
    - ✅ แยก `Incident Master Data`, `Checklist Master Data` และ `Holidays` เป็น route จริง
    - ✅ เพิ่ม Guide Button (📖) ให้หน้าอิสระใหม่
    - 🔄 กำลังตรวจสอบสิทธิ์ Route Permission (Admin-only)
5. รักษามาตรฐาน `UI_UX_SETTING.md` โดยทุกหน้า Setting ต้องมี Guide button และ layout ที่สอดคล้องกัน

---

## 3. Non-Goals

1. ไม่เปลี่ยน schema database ใน phase แรก
2. ไม่ migrate ข้อมูล master data ใน phase แรก
3. ไม่เปลี่ยน business logic ของ workflow, approval หรือ SLA calculation
4. ไม่สร้าง UI hack เพื่อซ่อนหรือแปลงชื่อข้อมูลให้ดูถูกต้อง
5. ไม่เปลี่ยน role/permission semantics นอกเหนือจากการจัด route/menu ให้ชัดเจน

---

## 4. Proposed Information Architecture

```text
Settings
├─ System Setup
│  ├─ No. Series
│  ├─ Working Hours
│  └─ Holidays
│
├─ Master Data
│  ├─ Incident Master Data
│  └─ Checklist Master Data
│
├─ Workflow & Approval
│  ├─ Workflow Rules
│  ├─ Approval Flows
│  └─ Substitute Approvers
│
├─ Users & Access
│  ├─ Users
│  └─ Permissions
│
└─ Audit & Logs
   └─ System Logs
```

---

## 5. Route Mapping

| New Group | Menu Label | Target Route | Implementation Notes |
|---|---|---|---|
| System Setup | No. Series | `/dashboard/settings/no-series` | ใช้หน้าเดิม |
| System Setup | Working Hours | `/dashboard/settings/working-hours` | ใช้หน้าเดิม หรือ refactor ให้เป็น canonical route |
| System Setup | Holidays | `/dashboard/settings/holidays` | แยกเป็น route เฉพาะ ไม่ผ่าน Master Data wrapper |
| Master Data | Incident Master Data | `/dashboard/settings/incident-master-data` | แยก route สำหรับ Incident Category, Affected System, SLA Exclusion Reason |
| Master Data | Checklist Master Data | `/dashboard/settings/checklist-master-data` | แยก route สำหรับ Checklist Category, Checklist Master, Procedure Plans |
| Workflow & Approval | Workflow Rules | `/dashboard/settings/workflow` | ใช้หน้าเดิม |
| Workflow & Approval | Approval Flows | `/dashboard/settings/approvals` | ใช้หน้าเดิม |
| Workflow & Approval | Substitute Approvers | `/dashboard/settings/substitutes` | ใช้หน้าเดิม |
| Users & Access | Users | `/dashboard/settings/users` | ใช้หน้าเดิม |
| Users & Access | Permissions | `/dashboard/settings/permissions` | ใช้หน้าเดิม |
| Audit & Logs | System Logs | `/dashboard/settings/logs` | ใช้หน้าเดิม |

---

## 6. Technical Design

### 6.1 Sidebar Menu Configuration

สร้างโครงสร้าง config ใน `app/dashboard/layout.js` หรือแยกเป็น helper file หากโค้ดเริ่มยาวเกินไป

Pseudo structure:

```javascript
const settingsGroups = [
  {
    key: 'system_setup',
    label: 'System Setup',
    icon: 'settings',
    items: [
      { href: '/dashboard/settings/no-series', label: 'No. Series', feature: 'settings' },
      { href: '/dashboard/settings/working-hours', label: 'Working Hours', feature: 'settings' },
      { href: '/dashboard/settings/holidays', label: 'Holidays', feature: 'settings' },
    ],
  },
  {
    key: 'master_data',
    label: 'Master Data',
    icon: 'database',
    items: [
      { href: '/dashboard/settings/incident-master-data', label: 'Incident Master Data', feature: 'settings' },
      { href: '/dashboard/settings/checklist-master-data', label: 'Checklist Master Data', feature: 'settings' },
    ],
  },
  {
    key: 'workflow_approval',
    label: 'Workflow & Approval',
    icon: 'workflow',
    items: [
      { href: '/dashboard/settings/workflow', label: 'Workflow Rules', feature: 'settings' },
      { href: '/dashboard/settings/approvals', label: 'Approval Flows', feature: 'settings' },
      { href: '/dashboard/settings/substitutes', label: 'Substitute Approvers', feature: 'settings' },
    ],
  },
  {
    key: 'users_access',
    label: 'Users & Access',
    icon: 'users',
    items: [
      { href: '/dashboard/settings/users', label: 'Users', feature: 'settings' },
      { href: '/dashboard/settings/permissions', label: 'Permissions', feature: 'settings' },
    ],
  },
  {
    key: 'audit_logs',
    label: 'Audit & Logs',
    icon: 'logs',
    items: [
      { href: '/dashboard/settings/logs', label: 'System Logs', feature: 'settings' },
    ],
  },
]
```

### 6.2 Permission Logic

ใช้ `checkPermission(permissions, 'settings')` เป็น source of truth สำหรับ Settings ทั้งหมด ตามมาตรฐาน Dynamic Permission Management

Pseudo logic:

```javascript
const settingsAccess = checkPermission(permissions, 'settings')

if (role !== 'admin' && settingsAccess === 'NONE') {
  hideSettingsSection()
}

for each settings item:
  if role === 'admin':
    show item
  else if settingsAccess === 'RO' or settingsAccess === 'RW':
    show item according to allowed role policy
  else:
    hide item
```

> [!IMPORTANT]
> ก่อน implement จริงต้องยืนยันกับ USER ว่า role อื่นนอกจาก `admin` ควรเห็น Settings แบบ Read-only หรือไม่ เพราะปัจจุบัน sidebar Settings ถูกครอบด้วย `role === 'admin'` แม้ `permission_sets` จะรองรับ RO/RW/NONE อยู่แล้ว

### 6.3 Master Data Query Param Behavior

ปรับ `app/dashboard/settings/master-data/page.js` ให้อ่าน query param เพื่อเลือกกลุ่มหรือ type เริ่มต้น

Pseudo logic:

```javascript
const searchParams = useSearchParams()
const group = searchParams.get('group')
const type = searchParams.get('type')

if (type exists and type in allMasterItems):
  activeType = type
else if group === 'incident':
  activeType = 'incident_category'
  visibleGroups = ['Incident Setup']
else if group === 'checklist':
  activeType = 'checklist_category'
  visibleGroups = ['Checklist Setup']
else:
  activeType = 'incident_category'
  visibleGroups = all groups except workflow setup if workflow moved out
```

### 6.4 Remove Workflow Setup From Master Data Navigation

เมื่อ `Workflow & Approval` แสดงใน sidebar แล้ว ให้ลบหรือซ่อน `Workflow Setup` group จาก `MASTER_GROUPS` ในหน้า Master Data เพื่อไม่ให้เมนูซ้ำ

Decision:

```text
If USER confirms full restructure:
  remove Workflow Setup from Master Data sidebar
Else:
  keep backward-compatible links during transition
```

### 6.5 Guide Button Compliance

ตาม `docs/standards/UI_UX_SETTING.md` ทุกหน้า Setting ต้องมี Guide button ขนาด 34x34px ถัดจาก title และเปิด modal ที่มีเนื้อหาเก็บใน `system_settings`

Pages requiring check or update:

| Page | Current Status | Required Action |
|---|---|---|
| No. Series | Has guide button | Verify modal/editing standard |
| Master Data | Has guide system | Verify group-specific guide content |
| Users | Has guide button | Verify admin edit mode |
| Logs | Has guide button | Verify admin edit mode |
| Permissions | Missing/unclear guide button | Add guide button and guide content key |
| Working Hours | Missing/unclear guide button | Add guide button or consolidate under Master Data guide |
| Workflow | Missing/unclear guide button | Add guide button and guide content key |
| Approvals | Missing/unclear guide button | Add guide button and guide content key |
| Substitutes | Missing/unclear guide button | Add guide button and guide content key |

Guide key convention:

```text
permissions_guide_content
working_hours_guide_content
workflow_guide_content
approvals_guide_content
substitutes_guide_content
```

---

## 7. Implementation Phases

### Phase 1: Navigation Restructure

Files:

- `app/dashboard/layout.js`

Tasks:

1. Replace flat Settings nav items with grouped Settings config
2. Render collapsible groups under Settings
3. Preserve admin override
4. Preserve dynamic permission check for `settings`
5. Ensure active state works with query params

Acceptance criteria:

- Admin sees grouped Settings menu
- Existing routes remain accessible
- Current active item is highlighted correctly
- Non-admin access behavior remains unchanged unless USER confirms otherwise

### Phase 2: Master Data Scope Cleanup

Files:

- `app/dashboard/settings/master-data/page.js`

Tasks:

1. Add query param support for `group` and `type`
2. Split visible groups by selected sidebar entry
3. Remove duplicated Workflow Setup group from the normal Master Data view
4. Keep direct route fallback for old links

Acceptance criteria:

- `/dashboard/settings/incident-master-data` shows Incident Setup only
- `/dashboard/settings/checklist-master-data` shows Checklist Setup only
- `/dashboard/settings/holidays` opens Holidays without Master Data wrapper
- Existing `/dashboard/settings/master-data` still loads without crash

- No route silently relies on missing permission map entries
- Admin override remains active

### Phase 4: Guide Compliance

Files:

- `app/dashboard/settings/permissions/page.js`
- `app/dashboard/settings/working-hours/page.js`
- `app/dashboard/settings/workflow/page.js`
- `app/dashboard/settings/approvals/page.js`
- `app/dashboard/settings/substitutes/page.js`

Tasks:

1. Add Guide button beside page title where missing
2. Add modal using the existing guide pattern from No. Series, Users, Logs, or Master Data
3. Store content in `system_settings` with `[page_name]_guide_content`
4. Show edit mode only for admin

Acceptance criteria:

- Every Setting page has Guide button
- Guide content loads from and saves to `system_settings`
- Non-admin users cannot edit guide content

### Phase 5: Visual and Regression Verification

Tasks:

1. Run lint/build if available and practical
2. Verify Settings menu on desktop width
3. Verify sidebar behavior on mobile width
4. Verify direct navigation to every settings route
5. Verify RO/NONE behavior if non-admin Settings visibility is enabled

Acceptance criteria:

- No route crash
- No overlapping menu text
- Active menu state is visible
- Existing data actions still work

---

## 8. Critical Questions Before Implementation

> [!IMPORTANT]
> ต้องถาม USER ก่อนเริ่มแก้จริงในประเด็นนี้: ผู้ใช้ role `auditor`, `it_staff` หรือ role อื่นควรเห็น Settings แบบ Read-only ตาม `permission_sets` หรือ Settings ควรเป็น admin-only เหมือน behavior ปัจจุบัน?

> [!IMPORTANT]
> ต้องถาม USER ก่อนลบ Workflow Setup ออกจาก Master Data: ต้องการให้ย้ายออกทันทีแบบไม่เหลือเมนูซ้ำ หรือให้มี transition period โดยทิ้ง shortcut เดิมไว้ก่อน?

---

## 9. Recommended Final Menu Labels

| Group | Label | Thai Meaning |
|---|---|---|
| System Setup | System Setup | ตั้งค่าพื้นฐานระบบ |
| Master Data | Master Data | ข้อมูลอ้างอิง |
| Workflow & Approval | Workflow & Approval | ขั้นตอนและผู้อนุมัติ |
| Users & Access | Users & Access | ผู้ใช้และสิทธิ์ |
| Audit & Logs | Audit & Logs | ประวัติและการตรวจสอบ |

Recommended item labels:

| Current | Recommended |
|---|---|
| No. Series | No. Series |
| Master Data | Incident Master Data / Checklist Master Data |
| Users | Users |
| System Logs | System Logs |
| Permissions | Permissions |
| Working Hours Setup | Working Hours |
| Workflow Settings | Workflow Rules |
| Approval Flows | Approval Flows |
| My Absence / Substitution | Substitute Approvers |
| Holidays | Holidays |

---

## 10. Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Query param support in Master Data changes initial active type | Medium | Add fallback to existing default `incident_category` |
| Settings route permission behavior changes unexpectedly | High | Ask USER before changing non-admin visibility |
| Duplicate links confuse users during transition | Medium | Decide whether to remove or keep shortcuts before implementation |
| Guide modal duplication increases code size | Medium | Reuse a shared Guide component if available or create scoped helper later |
| Mobile sidebar becomes too long | Medium | Use collapsible grouped sections and test mobile viewport |

---

## 11. Suggested Implementation Order

1. Confirm critical questions with USER
2. Refactor Settings nav config and grouped rendering
3. Add query param support to Master Data
4. Move Workflow/Approval links out of Master Data visible groups
5. Align route permission map
6. Add missing Guide buttons and content keys
7. Run build and UI verification
8. Update `docs/standards/UI_UX_SETTING.md` if final menu taxonomy is approved as a new standard
9. Update `docs/history/CHANGELOG.md`

---

## 12. Definition of Done

งานนี้จะถือว่าเสร็จเมื่อ:

1. Settings sidebar แสดงเป็น grouped menu ตาม IA ใหม่
2. หน้า Master Data ไม่ปน Workflow/Approval โดยไม่จำเป็น
3. ทุก route ใน `app/dashboard/settings/*/page.js` มีทางเข้าจาก UI หรือมีเหตุผลชัดเจนว่าทำไมเป็น internal route
4. Permission behavior ชัดเจนและสอดคล้องกับ `PERMISSIONS.md`
5. ทุก Setting page สอดคล้องกับ Guide standard ใน `UI_UX_SETTING.md`
6. ผ่าน build/lint ตามที่ project รองรับ
7. มีการอัปเดตเอกสารมาตรฐานหาก USER ยืนยัน taxonomy ใหม่
