# Audit Trail And Log Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ระบบ DOWA IT System มี audit trail ที่ใช้ตรวจสอบย้อนหลังได้จริงสำหรับการแก้ไขเอกสารและการตั้งค่าระบบ พร้อมหน้า Logs กลางที่เปิดดูหลักฐานได้โดยไม่ต้อง query database ตรง

**Architecture:** ใช้ `system_audit_logs` เป็นศูนย์กลางสำหรับ document edits และ settings changes, คง `admin_audit_logs` สำหรับ user/security actions, และคง `backup_logs` เป็น operational log แยก แต่รวมการอ่านใน viewer กลางเดียวกันผ่าน action/query layer ที่ normalize ข้อมูลให้อยู่ใน contract เดียวกัน

**Tech Stack:** Next.js App Router, Supabase, Server Actions, `system_audit_logs`, `admin_audit_logs`, `backup_logs`

**Status Update (06-Jun-2026 15:26):**
- `Task 1-5`: implementation complete
- `Task 6`: documentation standards updated
- `Verification`: targeted audit tests passed, full `npm test` passed, `npm run build` passed
- `Pending`: authenticated manual verification checklist and scoped cleanup/commit for Tasks 2-5 / Task 6 / Task 7
- `Runtime Note`: attempted `next dev` + browser verification on 06-Jun-2026, but no stable authenticated dev walkthrough was available from the current session

---

## File Structure

**Create**
- `docs/history/IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER.md`
- `app/actions/audit.js`
- `tests/audit-log-contract.test.js`
- `tests/audit-log-viewer.test.js`

**Modify**
- `app/actions/workflow.js`
- `app/actions/admin.js`
- `app/actions/target.js`
- `app/actions/checklist-template.js`
- `app/actions/procedure-plan.js`
- `app/actions/sla-settings.js`
- `app/dashboard/settings/logs/page.js`
- `app/dashboard/settings/working-hours/page.js`
- `app/dashboard/settings/holidays/page.js`
- `app/dashboard/settings/permissions/page.js`
- `app/dashboard/settings/substitutes/page.js`
- `app/dashboard/settings/_components/MasterDataScope.js`
- `app/dashboard/incidents/[id]/page.js`
- `app/dashboard/checklist/[id]/page.js`
- `docs/INDEX.md`
- `docs/standards/DEVELOPMENT.md`
- `docs/standards/AGENCY_QUICK_REFERENCE.md`

---

### Task 1: Define Audit Contract And Shared Helper

**Files:**
- Create: `app/actions/audit.js`
- Modify: `app/actions/workflow.js`
- Test: `tests/audit-log-contract.test.js`

- [x] **Step 1: Write the failing contract test**

Create `tests/audit-log-contract.test.js` covering:
- `buildFieldChanges(before, after, allowlist)` returns only changed fields
- hidden fields such as `signature_pin`, `otp_code`, `signature_data` are excluded
- JSON-heavy fields such as `template_data` are summarized instead of dumped raw
- `buildAuditLogPayload(...)` always includes `scope`, `entity_type`, `entity_id`, `entity_label`, `source_module`

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- FAIL because `app/actions/audit.js` does not exist yet

- [x] **Step 3: Create shared audit helper**

Implement `app/actions/audit.js` with focused helpers:
- `AUDIT_HIDDEN_FIELDS`
- `buildFieldChanges(before, after, allowlist, options)`
- `summarizeComplexField(field, oldValue, newValue)`
- `buildAuditLogPayload({ scope, entityType, entityId, entityLabel, action, details, userEmail, before, after, allowlist, metadata })`
- `recordEntityAuditLog(payload)` that writes to `system_audit_logs`

Rules:
- scalar changes store `old_value` / `new_value`
- arrays and large JSON store summary like `items changed`, `photo added`, `step count changed`
- payload uses `metadata.field_changes`
- payload must not write secrets

- [x] **Step 4: Refactor workflow wrapper to use shared helper**

Update `app/actions/workflow.js` so existing `recordAuditLog()` stays backward-compatible but delegates to the new helper where possible.

Do not break:
- approval flow logs
- legacy insert to `incident_logs` / `checklist_logs`
- current `getSystemLogs()` behavior for existing tabs

- [x] **Step 5: Run tests**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- PASS

- [x] **Step 6: Commit**

```bash
git add app/actions/audit.js app/actions/workflow.js tests/audit-log-contract.test.js
git commit -m "feat: add shared audit log contract"
```

---

### Task 2: Cover Incident Document Edit Audit Trail

**Files:**
- Modify: `app/dashboard/incidents/[id]/page.js`, `app/actions/audit.js`
- Test: `tests/audit-log-contract.test.js`

- [x] **Step 1: Add failing tests for incident field diff generation**

Extend `tests/audit-log-contract.test.js` with cases for:
- `severity` change
- `reporter_email` change
- `assigned_to_id` change
- `resolution`, `root_cause`, `corrective_action` change

- [x] **Step 2: Run targeted test**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- FAIL until field allowlist and payload mapping are updated

- [x] **Step 3: Add incident edit audit at save point**

Update `app/dashboard/incidents/[id]/page.js`:
- capture a normalized `before` snapshot from loaded incident
- build a normalized `after` snapshot from `updateData`
- after successful save, call a server-side helper/action to write `Updated` log with `field_changes`

Allowlist fields:
- `title`
- `severity`
- `category`
- `affected_system`
- `assigned_to_id`
- `reported_by`
- `reported_by_id`
- `reporter_email`
- `resolution`
- `root_cause`
- `corrective_action`
- `status` only when changed by direct edit flow

- [x] **Step 4: Preserve current special-case logs**

Keep existing explicit logs such as:
- `Change Severity`
- `Reporter Email Changed`

But add one canonical `Updated` audit entry for full diff so audit reviewers can see one structured row per save.

- [x] **Step 5: Re-run tests**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/incidents/[id]/page.js tests/audit-log-contract.test.js
git commit -m "feat: audit incident document edits"
```

---

### Task 3: Cover Checklist Document Edit Audit Trail

**Files:**
- Modify: `app/dashboard/checklist/[id]/page.js`, `app/actions/audit.js`
- Test: `tests/audit-log-contract.test.js`

- [x] **Step 1: Write failing checklist audit tests**

Add cases covering:
- item status changed `null -> OK/NG`
- `evaluation_result` and `evaluation_remark`
- `start_time`
- `total_duration_minutes`
- summarized `template_data` changes

- [x] **Step 2: Run targeted test**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- FAIL until checklist summarization exists

- [x] **Step 3: Add minimal server-backed audit hooks for checklist detail**

Without rewriting the whole checklist module in one pass, add logging at current mutation points in `app/dashboard/checklist/[id]/page.js`:
- `updateItemData`
- `saveStartTime`
- `updateItemDuration`
- `updateItemEvaluation`
- `handleStatusClick`
- `handleNgConfirm`
- `handleDocEvaluation`
- `handleDocRemarkChange`
- `handleT2ItemComplete`

For `template_data`, log summary only:
- photo count changed
- clicked link changed
- sign-off role changed
- procedure sub-step count changed

- [x] **Step 4: Add debounce/guard rules**

Prevent noisy logs:
- do not log when before/after are equivalent
- do not log repeated autosave for unchanged data
- collapse empty remark changes

- [x] **Step 5: Run tests**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/checklist/[id]/page.js app/actions/audit.js tests/audit-log-contract.test.js
git commit -m "feat: audit checklist document edits"
```

---

### Task 4: Add Settings And Master Data Audit Trail

**Files:**
- Modify: `app/dashboard/settings/working-hours/page.js`
- Modify: `app/dashboard/settings/holidays/page.js`
- Modify: `app/dashboard/settings/permissions/page.js`
- Modify: `app/dashboard/settings/substitutes/page.js`
- Modify: `app/dashboard/settings/_components/MasterDataScope.js`
- Modify: `app/actions/target.js`
- Modify: `app/actions/checklist-template.js`
- Modify: `app/actions/procedure-plan.js`
- Modify: `app/actions/sla-settings.js`
- Modify: `app/actions/audit.js`
- Test: `tests/audit-log-contract.test.js`

- [x] **Step 1: Write failing tests for settings payload classification**

Add cases to ensure payloads classify correctly:
- `scope = settings`
- `entity_type = working_hours | holiday | permission | substitute | master_data | checklist_target | checklist_template | procedure_plan | sla_settings`

- [x] **Step 2: Run targeted tests**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- FAIL because classification helpers and callers do not exist yet

- [x] **Step 3: Move high-risk settings mutations behind audited server paths**

Prioritize these first:
- `working_hours`
- `holidays`
- `permissions`
- `substitutes`

For each mutation:
- capture `before`
- apply update
- write structured audit event

- [x] **Step 4: Audit server actions already used by settings**

Add audit logging inside:
- `saveChecklistTarget()`
- `deleteChecklistTarget()`
- `addTargetType()`
- `deleteTargetType()`
- `saveChecklistTemplate()`
- `saveProcedurePlan()`
- `saveSLATargets()`
- `saveSLAExclusionReason()`

- [x] **Step 5: Add allowlists per settings entity**

Examples:
- `working_hours`: `start`, `end`, `work_days`
- `holiday`: `holiday_date`, `description`
- `permission`: `role_name`, `feature_key`, `access_level`
- `substitute`: `substitute_id`, `start_date`, `end_date`, `reason`, `is_active`
- `target`: `target_code`, `target_type`, `name`, `location`, `qr_value`, `is_active`
- `template`: `category`, `freq_type`, `item_label`, `instruction`, `ui_template_type`, `scope_mode`, `target_type`, `is_active`
- `procedure_plan`: `plan_name`, summarized `steps`
- `sla_limits`: `Response.*`, `Resolution.*`

- [x] **Step 6: Run tests**

Run: `npm test -- tests/audit-log-contract.test.js`

Expected:
- PASS

- [ ] **Step 7: Commit**

```bash
git add app/actions/audit.js app/actions/target.js app/actions/checklist-template.js app/actions/procedure-plan.js app/actions/sla-settings.js app/dashboard/settings/working-hours/page.js app/dashboard/settings/holidays/page.js app/dashboard/settings/permissions/page.js app/dashboard/settings/substitutes/page.js app/dashboard/settings/_components/MasterDataScope.js tests/audit-log-contract.test.js
git commit -m "feat: audit settings and master data changes"
```

---

### Task 5: Expand Logs Viewer To Support Audit Review

**Files:**
- Modify: `app/actions/workflow.js`
- Modify: `app/dashboard/settings/logs/page.js`
- Create: `tests/audit-log-viewer.test.js`

- [x] **Step 1: Write failing viewer tests**

Create `tests/audit-log-viewer.test.js` covering:
- `getSystemLogs('audit')` can return structured audit rows with `field_changes`
- `getSystemLogs('admin')` can return `admin_audit_logs`
- `getSystemLogs('backup')` can return `backup_logs`
- UI mapping can distinguish `Document Change`, `Settings Change`, `User Admin Action`, `Operational Backup`

- [x] **Step 2: Run tests**

Run: `npm test -- tests/audit-log-viewer.test.js`

Expected:
- FAIL because admin/backup sources are not supported yet

- [x] **Step 3: Extend query layer**

Update `getSystemLogs()` in `app/actions/workflow.js` to support:
- `audit`
- `approval`
- `login`
- `system`
- `admin`
- `backup`

Also normalize audit rows:
- `category`
- `docNo` or `entity_label`
- `action`
- `details`
- `user`
- `field_changes`
- `scope`

- [x] **Step 4: Extend Logs page UI**

Update `app/dashboard/settings/logs/page.js`:
- add tabs for `Admin Actions` and `Backup Logs`
- add detail modal for `field_changes`
- show old/new diff rows when metadata exists
- keep existing tabs backward-compatible

- [x] **Step 5: Preserve approval reset guardrails**

Do not loosen:
- auditor read-only behavior
- admin-only reset workflow action

- [x] **Step 6: Run tests**

Run: `npm test -- tests/audit-log-viewer.test.js`

Expected:
- PASS

- [ ] **Step 7: Commit**

```bash
git add app/actions/workflow.js app/dashboard/settings/logs/page.js tests/audit-log-viewer.test.js
git commit -m "feat: expand logs viewer for audit review"
```

---

### Task 6: Document The New Audit Standard

**Files:**
- Modify: `docs/standards/DEVELOPMENT.md`
- Modify: `docs/standards/AGENCY_QUICK_REFERENCE.md`
- Modify: `docs/INDEX.md`

- [x] **Step 1: Update standard documents**

Add explicit standard language for:
- structured audit events
- hidden fields that must never be logged
- distinction between `audit logs` and `operational logs`
- viewer expectations for audit review

- [x] **Step 2: Update documentation index**

Ensure `docs/INDEX.md` lists:
- this implementation plan
- updated standards if descriptions need adjustment

- [x] **Step 3: Manual self-review**

Verify docs do not contradict current architecture:
- `system_audit_logs` for document/settings
- `admin_audit_logs` for user/security
- `backup_logs` as operational logs

- [ ] **Step 4: Commit**

```bash
git add docs/standards/DEVELOPMENT.md docs/standards/AGENCY_QUICK_REFERENCE.md docs/INDEX.md docs/history/IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER.md
git commit -m "docs: define audit trail implementation plan and standards"
```

---

### Task 7: Verification Before Completion

**Files:**
- Test: `tests/audit-log-contract.test.js`
- Test: `tests/audit-log-viewer.test.js`
- Manual: `app/dashboard/incidents/[id]/page.js`, `app/dashboard/checklist/[id]/page.js`, `app/dashboard/settings/logs/page.js`

- [x] **Step 1: Run targeted tests**

Run:
- `npm test -- tests/audit-log-contract.test.js`
- `npm test -- tests/audit-log-viewer.test.js`

Expected:
- PASS

- [x] **Step 2: Run full regression suite**

Run: `npm test`

Expected:
- PASS 100%

- [x] **Step 3: Run production build**

Run: `npm run build`

Expected:
- PASS

- [ ] **Step 4: Manual verification checklist**

Verify:
- editing incident writes a structured audit entry
- editing checklist writes a structured audit entry
- editing working hours / holidays / permissions writes a structured audit entry
- user admin actions still appear
- logs viewer tabs load correctly
- auditor can read allowed views but cannot mutate

Current status note:
- Targeted tests and `npm run build` already passed
- Browser/runtime verification was attempted on 06-Jun-2026, but the current session did not have a stable authenticated walkthrough environment to complete this checklist end-to-end

- [x] **Step 5: Update changelog and user tasks**

After implementation passes:
- add completion note to `docs/history/CHANGELOG.md`
- update `docs/history/USER_TASKS.md` if the work was tracked there

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: deliver audit-ready log coverage and viewer"
```

---

## Risks And Guardrails

- Do not log secrets such as PIN, OTP, raw signature payload, or password-related fields
- Do not dump full `template_data` blobs into logs; use summaries only
- Do not break current `workflow.js` approval logs while refactoring shared helpers
- Do not move `backup_logs` into `system_audit_logs`; keep operational data separated from audit evidence
- Any settings mutation that still uses direct client-side `supabase.from(...).update/insert/delete` after this plan should be considered incomplete

## Success Criteria

- Audit reviewer can open one logs UI and answer who changed what, when, and from what value to what value
- Incident edits and checklist edits generate structured change logs
- Core settings pages generate structured change logs
- Existing user admin actions remain visible
- Approval, login, system, admin, and backup logs are all viewable without direct DB access
