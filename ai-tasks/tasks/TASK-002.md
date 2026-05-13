# TASK-002 — Fix Audit Logs Mobile Table Experience

## Workflow Metadata
- **Model Role:** Fast AI
- **Input:** `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md`
- **Status:** Ready for Execution
- **Priority:** P1
- **Scope:** `/dashboard/settings/logs` responsive table and mobile layout

## Objective
Improve the Audit Logs table on smartphone widths so columns remain readable through table-level horizontal scrolling, without squeezing content or creating whole-page horizontal overflow.

## Evidence From Current Code
- `app/dashboard/settings/logs/page.js:L180-L181` sets the page container to `height: '100vh'` and `overflow: 'hidden'`.
- `app/dashboard/settings/logs/page.js:L199-L200` sets `.table-wrapper { overflow-x: auto; margin: 0 -12px; }` and `.logs-table { min-width: 800px; }`.
- `app/dashboard/settings/logs/page.js:L310-L314` renders the table wrapper as a flex child with `overflow: 'auto'`.
- `app/dashboard/settings/logs/page.js:L333` renders `<table className="logs-table">`.
- `app/dashboard/settings/logs/page.js:L417` limits the login user agent column with `maxWidth: 300`, ellipsis, and nowrap.
- `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md:L52-L53` identifies table column squeezing for tables with more than 6 columns, especially Audit Logs.

## Standards To Follow
- `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md:L135-L139` requires mobile tables to be wrapped with horizontal scrolling.
- `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md:L144-L148` sets `/dashboard/settings/logs` mobile min-width to `800px`.
- `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md:L305-L316` requires logs filters to stack on mobile and timestamp, actor, action, entity to remain scannable.
- `docs/standards/UI_UX_RESPONSIVE.md:L12-L19` requires table overflow to be scoped to table wrappers and touch targets to remain usable.

## Files In Scope
- `app/dashboard/settings/logs/page.js`

## Required Technical Logic
1. Preserve `logs-table` minimum width at **at least** `800px`.
2. Ensure horizontal scroll is scoped to the table wrapper:
   ```text
   page container:
       width: 100%
       overflow-x: hidden
   table wrapper:
       overflow-x: auto
       -webkit-overflow-scrolling: touch
   table:
       min-width >= 800px
       width: max-content or 100% with min-width
   ```
3. Remove or adjust negative mobile margins if they cause whole-page overflow:
   ```text
   IF wrapper margin causes body/clientWidth overflow:
       replace with border-radius/padding adjustment
   ELSE:
       keep only if Playwright/mobile evidence proves body width is stable
   ```
4. Keep the sticky header behavior intact.
5. Keep mobile header/action stacking intact.

## Implementation Constraints
- Do not reduce font sizes using viewport width scaling.
- Do not hide important columns to make the table look correct.
- Do not change log data mapping or workflow reset logic.
- Do not add fixed-width page containers that violate responsive standards.

## Validation Checklist
- [ ] At 320px viewport, body/page does not horizontally scroll.
- [ ] At 360px viewport, only the logs table wrapper scrolls horizontally.
- [ ] Audit tab with six columns remains readable.
- [ ] Approval tab Manage column remains reachable by horizontal scroll.
- [ ] Login tab user agent column still truncates cleanly.
- [ ] Print styles remain unaffected.

## Suggested Verification Commands
```text
npm run lint
```

If a dev server is available, verify `/dashboard/settings/logs` in the browser at 320px and 360px widths.

## Expected Fast AI Report
```text
TASK-002 Result
Status: Pass / Fail / Escalate
Files Changed:
- ...
Evidence:
- file:line — finding
Validation:
- ...
```

