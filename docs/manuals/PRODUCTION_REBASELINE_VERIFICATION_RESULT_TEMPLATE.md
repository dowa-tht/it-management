# Production Re-baseline Verification Result Template

ใช้ template นี้คู่กับ `PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md` และ `PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md`

---

## Step Results

| Step | Evidence | Status | Decision | Note |
|---|---|---|---|---|
| `Step 1 Schema Verification` | `<query/screenshot>` | `PASS/FAIL` | `continue/stop` | `<fill-me>` |
| `Step 2 Row-count Verification` | `<query/file>` | `PASS/FAIL` | `continue/stop` | `<fill-me>` |
| `Step 3 Dependency Verification` | `<query>` | `PASS/FAIL` | `continue/stop` | `<fill-me>` |
| `Step 4 Selected User Verification` | `<query/login>` | `PASS/FAIL` | `continue/stop` | `<fill-me>` |
| `Step 5 Settings Smoke Test` | `<page checks>` | `PASS/FAIL` | `continue/stop` | `<fill-me>` |
| `Step 6 Workflow/Substitute Verification` | `<query/page>` | `PASS/FAIL` | `continue/stop` | `<fill-me>` |
| `Step 7 RLS/Security Sanity` | `<query>` | `PASS/FAIL` | `continue/stop` | `<fill-me>` |
| `Step 8 Release Decision` | `<final review>` | `PASS/FAIL` | `release/rollback` | `<fill-me>` |

---

## Critical Gates

```text
[ ] migrations apply ครบ
[ ] row counts สมเหตุสมผล
[ ] selected users login ได้ครบ
[ ] workflow_configs ใช้งานได้
[ ] approval_substitutes ใช้งานได้
[ ] working_hours / sla_exclusions / sla_holidays ถูก lock ครบ
[ ] orphan mappings = 0
```

---

## Final Block

```text
RELEASE_NAME: <fill-me>
SOURCE_COMMIT_SHA: <fill-me>
TARGET_REPO: dowa-tht/it-management
TARGET_DB: yrgsukhjkoexvdybyyjm
VERIFICATION_RESULT: PASS / FAIL
ROLLBACK_REQUIRED: YES / NO
OPERATOR: <fill-me>
TIMESTAMP: <fill-me>
```
