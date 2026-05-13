# Implementation Plan: Incident Accept / Dispatch Audit-Safe Workflow

**Document Type:** Implementation History / Technical Plan  
**Target Module:** Incident Management  
**Status:** Ready for Implementation  
**Created:** 2026-05-12 17:24 ICT  
**Owner Direction:** USER confirmed that 1 user can have only 1 role. The system must separate `it_staff` self-accept from `administrator` dispatch-to-IT flow for audit clarity.

---

## 1. Objective

ปรับปรุงระบบ Incident Accept/Acknowledge ให้สอดคล้องกับหลัก Audit และ Segregation of Duties โดยกำหนดให้:

1. `it_staff` สามารถกด Accept เพื่อรับงานเข้าเป็นงานของตนเองได้ทันที
2. `administrator` สามารถกดปุ่มเพื่อมอบหมายงานได้ แต่ต้องเลือก `it_staff` ก่อน และระบบต้องไม่บันทึกลง DB จนกว่าจะเลือกผู้รับผิดชอบ
3. ผู้รับผิดชอบงานจริงใน Incident ต้องเป็น `it_staff` เท่านั้น
4. Log ต้องแยกความหมายระหว่าง `Acknowledge by IT Staff` และ `Dispatch by Administrator` อย่างชัดเจน
5. `can_be_assignee` ไม่ใช่ Source of Truth หลักสำหรับ Incident Assignment ในแผนนี้ ให้ลดบทบาทเป็นข้อมูลแสดงผลหรือเลิกใช้ใน Incident logic

---

## 2. Current Evidence and Problem

### 2.1 Current Accept button has no role guard

File: `components/workflow/WorkflowActionBar.js`

Current behavior:

```text
If status === 'Open', the Accept button is rendered.
No role, permission, or assignee validation is applied in WorkflowActionBar.
```

Evidence:

- `components/workflow/WorkflowActionBar.js:101-110` renders `รับเรื่อง (Accept)` when `status === 'Open'`.

### 2.2 Current Incident detail page sends acknowledge handler without role-specific flow

File: `app/dashboard/incidents/[id]/page.js`

Current behavior:

```text
onAcknowledge always opens the same AcknowledgeDialog.
```

Evidence:

- `app/dashboard/incidents/[id]/page.js:468-478` passes `onAcknowledge={() => setShowAcknowledgeDialog(true)}`.

### 2.3 Current AcknowledgeDialog assigns from admin/it_staff roles together

File: `app/dashboard/incidents/[id]/page.js`

Current behavior:

```text
Dropdown selects users where role IN ['admin', 'it_staff'].
```

Evidence:

- `app/dashboard/incidents/[id]/page.js:803-806` selects `user_profiles` with `.in('role', ['admin', 'it_staff'])`.

Problem:

- This can make `administrator` appear as assignee, which is audit-risky.
- This does not distinguish IT operation from system administration.

### 2.4 Current server action has no actor/assignee validation

File: `app/actions/incidents.js`

Current behavior:

```text
acknowledgeIncident(id, severity, assigneeId)
1. Checks only session.
2. Loads assignee full_name.
3. Updates incident status and assigned_to fields.
```

Evidence:

- `app/actions/incidents.js:107-127` performs update without checking actor role or assignee role.

Problem:

- Any reachable call path can attempt to assign any existing user ID.
- No server-side protection against assigning to `administrator`.

---

## 3. Target Architecture

### 3.1 Single-role rule

The system must assume:

```text
One user has exactly one role.
No multi-role logic is allowed for this implementation.
```

### 3.2 Role responsibilities

| Role | Can click Incident action | Can be assigned as incident owner | Audit meaning |
|---|---:|---:|---|
| `it_staff` | Yes: Accept own work | Yes | IT operator accepts and owns the work |
| `admin` / `administrator` normalized as current code uses | Yes: Dispatch only | No | System/admin coordinator dispatches work to IT Staff |
| `employee` / other roles | No | No | Requester or non-operator |
| `auditor` | No | No | Read-only reviewer |

> Important: use the actual normalized role values already used in code. Current Incident page checks `currentUser?.role === 'admin' || currentUser?.role === 'it_staff'`. Do not introduce `administrator` string unless role normalization requires it. Verify actual profile roles before coding.

### 3.3 Incident owner rule

For all Incident Accept/Dispatch outcomes:

```text
incidents.assigned_to_id MUST point to an active user_profiles row where role === 'it_staff'.
incidents.assigned_to MUST be that IT Staff user's full_name or email fallback.
```

Administrator must never be stored as `assigned_to_id` for Accept/Dispatch, unless the administrator user's role is actually changed to `it_staff`.

### 3.4 Actor vs Assignee distinction

The system must distinguish:

```text
actor = user who performs the UI/server action
assignee = IT Staff user who owns the incident work
```

Because current `incidents` table may not have `acknowledged_by_id` or `dispatched_by_id`, the minimum required audit trail is `recordLog()`.

If columns already exist, agent may use them only after verifying schema. Do not assume they exist.

---

## 4. Required UX Behavior

### 4.1 Button label by role

On Incident detail page when `incident.status === 'Open'`:

```text
IF currentUser.role === 'it_staff':
    Show button label: "⚡ รับเรื่อง (Accept)"

ELSE IF currentUser.role === 'admin':
    Show button label: "📌 มอบหมายงาน (Dispatch)"

ELSE:
    Hide the button
```

Do not show Accept/Dispatch button to employee/auditor/other roles.

### 4.2 IT Staff flow

When current user is `it_staff` and clicks Accept:

```text
Option 1 preferred UX:
    Show confirm modal with severity selection only.
    Assignee is fixed to current user and must not be editable.

Minimum acceptable UX:
    Reuse modal but dropdown must be hidden or disabled with current IT Staff selected.
```

Required UI text:

```text
Title: รับเรื่อง (Accept)
Description: คุณจะรับเคสนี้เป็นผู้รับผิดชอบงาน
Assignee display: current IT Staff full name, read-only
```

### 4.3 Administrator flow

When current user is `admin` and clicks Dispatch:

```text
Open Dispatch modal.
Do not update DB until admin selects an active IT Staff and confirms.
Dropdown must list only active users where role === 'it_staff'.
```

Required UI text:

```text
Title: มอบหมายงาน (Dispatch)
Description: เลือก IT Staff ที่จะเป็นผู้รับผิดชอบงาน ระบบจะบันทึกว่าคุณเป็นผู้มอบหมายงาน ไม่ใช่ผู้รับผิดชอบงาน
Dropdown label: ผู้รับผิดชอบงาน / IT Staff Assignee
Confirm button: ยืนยันมอบหมายงาน
```

### 4.4 Empty IT Staff list handling

If no active `it_staff` exists:

```text
Show disabled dropdown or warning message:
"ยังไม่มี IT Staff ที่เปิดใช้งานสำหรับรับมอบหมายงาน กรุณาตรวจสอบ Account Management"
Confirm button must be disabled.
```

---

## 5. Required Server-side Logic

### 5.1 Update function contract

Modify or replace `acknowledgeIncident()` in `app/actions/incidents.js`.

Recommended signature:

```javascript
export async function acknowledgeIncident(id, severity, assigneeId = null) { ... }
```

Do not require `actionType` from client as source of truth. Server must derive behavior from actor role.

### 5.2 Server pseudocode

Implement exactly this decision logic:

```text
session = getCurrentUserSession()
IF no session:
    return { success: false, error: 'Unauthorized' }

actorEmail = session.user.email
actorProfile = SELECT id, email, full_name, role, is_active FROM user_profiles WHERE id = session.user.id OR email = actorEmail

IF actorProfile not found OR actorProfile.is_active !== true:
    return { success: false, error: 'ไม่พบสิทธิ์ผู้ใช้งานหรือผู้ใช้ถูกระงับ' }

IF incident.status !== 'Open':
    return { success: false, error: 'เอกสารนี้ไม่อยู่ในสถานะ Open จึงรับเรื่องไม่ได้' }

IF actorProfile.role === 'it_staff':
    finalAssignee = actorProfile
    actionName = 'รับเรื่อง (Acknowledge)'
    logDetails = `IT Staff: ${actorProfile.full_name || actorEmail} รับเรื่องและเป็นผู้รับผิดชอบงาน | ระดับ: ${severity}`

ELSE IF actorProfile.role === 'admin':
    IF assigneeId is empty:
        return { success: false, error: 'กรุณาเลือก IT Staff ผู้รับผิดชอบงาน' }

    finalAssignee = SELECT id, email, full_name, role, is_active FROM user_profiles WHERE id = assigneeId

    IF finalAssignee not found:
        return { success: false, error: 'ไม่พบผู้รับผิดชอบงานที่เลือก' }

    IF finalAssignee.is_active !== true:
        return { success: false, error: 'IT Staff ที่เลือกถูกระงับการใช้งาน' }

    IF finalAssignee.role !== 'it_staff':
        return { success: false, error: 'ผู้รับผิดชอบงานต้องเป็น role IT Staff เท่านั้น' }

    actionName = 'มอบหมายงาน (Dispatch)'
    logDetails = `Administrator: ${actorProfile.full_name || actorEmail} มอบหมายงานให้ IT Staff: ${finalAssignee.full_name || finalAssignee.email} | ระดับ: ${severity}`

ELSE:
    return { success: false, error: 'คุณไม่มีสิทธิ์รับเรื่องหรือมอบหมายงาน Incident' }

UPDATE incidents SET:
    status = 'In Progress'
    severity = severity
    assigned_to_id = finalAssignee.id
    assigned_to = finalAssignee.full_name || finalAssignee.email
    acknowledged_at = now
    assigned_at = now
WHERE id = incident id AND status = 'Open'

IF update affected 0 rows:
    return { success: false, error: 'ไม่สามารถรับเรื่องได้ อาจมีผู้ใช้อื่นดำเนินการไปแล้ว' }

recordLog(id, 'incident', actionName, logDetails, actorEmail)

return { success: true }
```

### 5.3 Concurrency guard

The update must include `eq('status', 'Open')` in addition to `eq('id', id)`.

Required:

```javascript
.eq('id', id)
.eq('status', 'Open')
```

Reason:

```text
Prevent double accept/dispatch if two users open the same incident simultaneously.
```

### 5.4 Severity validation

Server must validate severity:

```text
Allowed severities: Low, Medium, High
If invalid, reject with error: 'ระดับความรุนแรงไม่ถูกต้อง'
```

---

## 6. Required Frontend Changes

### 6.1 File: `app/dashboard/incidents/[id]/page.js`

Required state changes:

```javascript
const [showAcknowledgeDialog, setShowAcknowledgeDialog] = useState(false)
```

Can be reused, but modal must receive current user role and implement different behavior.

Required derived variables:

```javascript
const canAcknowledgeIncident = incident.status === 'Open' && ['admin', 'it_staff'].includes(currentUser?.role)
const acknowledgeActionLabel = currentUser?.role === 'admin'
  ? '📌 มอบหมายงาน (Dispatch)'
  : '⚡ รับเรื่อง (Accept)'
```

Do not let employee/auditor see Accept/Dispatch.

### 6.2 File: `components/workflow/WorkflowActionBar.js`

Add props:

```javascript
canAcknowledge = false,
acknowledgeLabel = '⚡ รับเรื่อง (Accept)',
```

Replace current unconditional Open-status render:

```javascript
status === 'Open' && <button ...>
```

With:

```javascript
status === 'Open' && canAcknowledge && <button ...>{acknowledgeLabel}</button>
```

This is required. Do not rely only on hiding in parent.

### 6.3 Acknowledge/Dispatch modal behavior

Existing `AcknowledgeDialog` may be refactored instead of replaced.

Required props:

```javascript
currentUser
currentSeverity
loading
onCancel
onConfirm
```

Required modal rules:

```text
IF currentUser.role === 'it_staff':
    Do not query staff list.
    Show current user as read-only assignee.
    onConfirm sends { severity, assignee_id: currentUser.id }

IF currentUser.role === 'admin':
    Query user_profiles with:
        select('id, full_name, email, role, is_active')
        eq('role', 'it_staff')
        eq('is_active', true)
        order('full_name') if supported
    Require selected assignee.
    onConfirm sends { severity, assignee_id: selectedItStaffId }
```

Do not query `.in('role', ['admin', 'it_staff'])` anymore.

---

## 7. Required Account Management Changes

### 7.1 Source of truth

For Incident Assignment in this plan:

```text
role === 'it_staff' is Source of Truth for being assignable.
```

`can_be_assignee` must not be used to determine Incident assignee.

### 7.2 Account Management UI

File: `app/dashboard/settings/users/page.js`

Change Assignee column behavior:

```text
Make the Assignee indicator read-only.
Do not allow toggle click to update can_be_assignee.
Display ON if user.role === 'it_staff'.
Display OFF otherwise.
Tooltip or helper text: "กำหนดจาก Role อัตโนมัติ: IT Staff = Assignee"
```

Remove or disable click handler that calls:

```javascript
updateAdminUser({ id: u.id, can_be_assignee: newStatus })
```

Evidence of current handler to remove/disable:

- `app/dashboard/settings/users/page.js:716-720` toggles `can_be_assignee`.

### 7.3 Create/Edit user modal

If create/edit form currently has editable `can_be_assignee` toggle, disable or remove it.

Required replacement text:

```text
Assignee status is derived from Role. Select role IT Staff to make this user assignable in Incident workflow.
```

Do not silently keep editable toggle if it no longer affects logic.

---

## 8. Data Migration / Data Compatibility

No database migration is strictly required for this plan if `role` and `is_active` already exist in `user_profiles`.

However, implementation agent must verify:

```text
user_profiles.role values include actual IT Staff value as 'it_staff'.
user_profiles.is_active exists and is boolean.
```

`can_be_assignee` may remain in DB for backward compatibility but must not drive Incident assignment logic.

Optional cleanup is not part of this implementation unless USER explicitly approves.

---

## 9. Required Documentation Updates

After implementation, update these files:

### 9.1 `docs/standards/INCIDENT_MANAGEMENT.md`

Add a section:

```text
Incident Accept / Dispatch Role Standard
- IT Staff may Accept Open incidents and becomes the assigned owner.
- Administrator may Dispatch Open incidents to active IT Staff only.
- Administrator must not be stored as Incident assignee through Accept/Dispatch flow.
- Logs must distinguish Acknowledge by IT Staff vs Dispatch by Administrator.
```

### 9.2 `docs/standards/PERMISSIONS.md`

Add or update role/action matrix:

```text
Incident Accept: it_staff only
Incident Dispatch: admin only, target must be it_staff
Incident Assignee: it_staff only
```

### 9.3 `docs/history/CHANGELOG.md`

Add timestamped change log after implementation.

---

## 10. Verification Checklist

Implementation agent must perform all checks below and report evidence with file path + line numbers.

### 10.1 UI verification

- Login as `it_staff`:
  - Open an `Open` incident.
  - Button label must be `รับเรื่อง (Accept)`.
  - Modal must show current user as read-only assignee.
  - Confirm must assign incident to current IT Staff.

- Login as `admin`:
  - Open an `Open` incident.
  - Button label must be `มอบหมายงาน (Dispatch)`.
  - Modal must require selecting active IT Staff.
  - Confirm must assign incident to selected IT Staff, not admin.

- Login as non-admin/non-it_staff:
  - Open an `Open` incident.
  - Accept/Dispatch button must not be visible.

### 10.2 Server verification

Directly call server action or test via UI:

```text
actor role employee -> reject
actor role admin with no assigneeId -> reject
actor role admin with assignee role admin -> reject
actor role admin with inactive it_staff -> reject
actor role it_staff -> assignee must be actor
```

### 10.3 DB verification

After admin dispatch:

```text
incidents.assigned_to_id = selected IT Staff id
incidents.assigned_to = selected IT Staff name/email
incidents.status = In Progress
logs actor/email = admin email
log action = มอบหมายงาน (Dispatch)
```

After IT Staff accept:

```text
incidents.assigned_to_id = IT Staff actor id
logs actor/email = IT Staff email
log action = รับเรื่อง (Acknowledge)
```

### 10.4 Build verification

Run:

```text
npm run build
```

Build must pass.

---

## 11. Explicit Non-goals

Do not implement the following unless USER separately approves:

1. Multi-role user model
2. New database role table
3. Deleting `can_be_assignee` column
4. Assigning incidents to administrator
5. Allowing IT Staff to dispatch to other IT Staff instead of accepting self
6. Using UI-only checks without server validation

---

## 12. Final Acceptance Criteria

The work is complete only when all criteria below are true:

1. `administrator` cannot become `incidents.assigned_to_id` through Accept/Dispatch flow.
2. `it_staff` can accept Open incident and becomes assignee automatically.
3. `administrator` can dispatch Open incident only after selecting active `it_staff`.
4. Employee/auditor cannot see or execute Accept/Dispatch.
5. Server action enforces all role and target validations.
6. Logs distinguish `รับเรื่อง (Acknowledge)` from `มอบหมายงาน (Dispatch)`.
7. Account Management Assignee indicator is read-only and derived from role.
8. Documentation standards and changelog are updated.
9. Build passes.

