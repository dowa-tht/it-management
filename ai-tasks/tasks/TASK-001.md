# TASK-001 — Complete Settings Guide Coverage

## Workflow Metadata
- **Model Role:** Fast AI
- **Input:** `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md`
- **Status:** Ready for Execution
- **Priority:** P1
- **Scope:** Settings guide buttons and guide content for Incident Master Data and Checklist Master Data

## Objective
Ensure Incident Master Data and Checklist Master Data have complete, non-placeholder Guide behavior that follows the Settings Guide Button Standard.

This task must not create a UI-only workaround. Guide content must come from the documented source of truth (`system_settings`) with safe fallback content only when the key does not exist.

## Evidence From Current Code
- `app/dashboard/settings/incident-master-data/page.js:L7-L9` uses `MasterDataStandalonePage` with `forcedGroup="incident"`.
- `app/dashboard/settings/checklist-master-data/page.js:L7-L10` uses `MasterDataStandalonePage` with `forcedGroup="checklist"` and `initialType="checklist_category"`.
- `app/dashboard/settings/_components/MasterDataScope.js:L112-L125` centralizes standalone Master Data state and active type selection.
- `app/dashboard/settings/_components/MasterDataScope.js:L182-L186` reads `[activeType]_guide_content` from `system_settings` and falls back to default content.
- `app/dashboard/settings/_components/MasterDataScope.js:L336` renders a Guide button.
- `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md:L48-L50` identifies Missing/Incomplete Guides in Incident Master Data and Checklist Master Data.

## Standards To Follow
- `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md:L321-L329` requires every Settings page to have a Guide button and use `[page]_guide_content` in `system_settings`.
- `docs/standards/UI_UX_SETTING.md` Section 4 requires Guide UI, markdown sections, and administrator-only editing.
- `docs/standards/ZERO_HACK_POLICY.md:L6` prohibits display-only fixes that hide incorrect source data.

## Files In Scope
- `app/dashboard/settings/_components/MasterDataScope.js`
- `app/dashboard/settings/incident-master-data/page.js` only if page-level title/subtitle metadata must be clarified
- `app/dashboard/settings/checklist-master-data/page.js` only if page-level title/subtitle metadata must be clarified
- Optional server action file if needed to comply with the project rule that Client Components must not fetch data directly.

## Required Technical Logic
1. Inspect all master data guide types currently supported by `DEFAULT_MASTER_GUIDES`.
2. For each active type, verify fallback content is not placeholder-only:
   - `incident_category`
   - `affected_system`
   - `sla_exclusion_reason`
   - `checklist_category`
   - `checklist_template`
   - `procedure_plan`
3. Guide key logic must remain deterministic:
   ```text
   guideKey = `${activeType}_guide_content`
   IF system_settings[guideKey] exists AND value is non-empty:
       render database value
   ELSE:
       render DEFAULT_MASTER_GUIDES[activeType]
   ```
4. Editing must be administrator-only:
   ```text
   IF currentUser.role == "admin":
       show Edit button
       allow save to system_settings[guideKey]
   ELSE:
       hide Edit button
       render guide read-only
   ```
5. If any guide content is stored with an obsolete key, do not map it in UI. Report it and propose data migration instead.

## Implementation Constraints
- Do not use status/label conversion hacks.
- Do not hard-code fake "completed" content only to satisfy the audit.
- Do not change unrelated Master Data CRUD behavior.
- If new data access is added, prefer Server Action or Route Handler instead of adding more direct Supabase reads in a Client Component.

## Validation Checklist
- [ ] Incident Master Data shows Guide button beside/in header title.
- [ ] Checklist Master Data shows Guide button beside/in header title.
- [ ] Each active master data type opens guide content with no placeholder text such as "ยังไม่ได้ตั้งค่า" unless no default exists.
- [ ] Admin can edit and save guide content.
- [ ] Non-admin cannot see the edit action.
- [ ] Existing Incident and Checklist Master Data CRUD still works.
- [ ] No UI hack or key alias is introduced.

## Expected Fast AI Report
```text
TASK-001 Result
Status: Pass / Fail / Escalate
Files Changed:
- ...
Evidence:
- file:line — finding
Validation:
- ...
```

