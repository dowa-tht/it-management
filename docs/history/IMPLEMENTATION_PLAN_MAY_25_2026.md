# Implementation Plan - May 25, 2026

## 📋 Summary of Changes

### งานที่ 1: Workflow Settings UI Filter [Quick]
**File:** `app/dashboard/settings/workflow/page.js`
**Change:** Filter users dropdown by selected role
**Logic:** When user selects "Admin" role, only show users with role='admin' in the "ระบุผู้อนุมัติเฉพาะเจาะจง" dropdown

### งานที่ 2: Cancel Document Feature [Critical]
**New Files:**
- `app/actions/cancel-document.js` - Server action for cancellation

**Modified Files:**
- `app/actions/workflow.js` - Add `cancelDocument()` function
- `app/dashboard/checklist/[id]/page.js` - Add cancel button and PIN dialog
- `app/dashboard/incidents/[id]/page.js` - Add cancel button and PIN/OTP verify

**Database Changes:**
- Add `status` enum value 'Cancelled' to checklist_docs and incidents
- Update workflow engine to handle cancelled status

**Security Requirements:**
- Checklist: Any creator/admin can cancel
- Incident: Must verify via PIN or OTP from Reporter before cancel

### งานที่ 3: Checklist Detail Redesign [Critical]
**Database Migration:** `supabase/migrations/20260525_checklist_item_time_tracking.sql`
```sql
-- Add columns to checklist_items
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS 
  duration_minutes INTEGER, -- Duration in minutes (HH:mm converted)
  evaluation_result TEXT CHECK (evaluation_result IN ('OK', 'NG', null)),
  responsible_person TEXT, -- Person assigned to this step
  evaluation_criteria TEXT; -- Criteria for evaluation

-- Add columns to checklist_docs
ALTER TABLE checklist_docs ADD COLUMN IF NOT EXISTS
  start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  total_duration_minutes INTEGER,
  calculated_end_time TIMESTAMPTZ; -- Start time + sum of all item durations
```

**UI Changes:**
- `app/dashboard/checklist/[id]/page.js` - Complete redesign of checklist items section
- Format: DD/mmm/yyyy HH:mm (24H format) for start/end times
- Input: HH:mm for each step duration
- Auto-calculate: End time = Start time + sum of all durations
- Evaluation: OK/NG checkbox per item

### งานที่ 4: Procedure Plan Editor Label [Quick]
**File:** `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`
**Change:** "Instruction" → "ขั้นตอนการดำเนินการ"

---

## 🔄 Execution Order

1. **Task 4** - Quick label change (5 min)
2. **Task 1** - Quick filter fix (15 min)
3. **Task 2** - Cancel feature (2-3 hours)
4. **Task 3** - Database migration + UI redesign (4-5 hours)
5. **Tests** - Run npm test (10 min)
6. **Build & Push** - Deploy (5 min)

---

## ⚠️ Critical Considerations

### Task 3 Database Impact
- New columns allow NULL for backward compatibility
- Existing data will have NULL values (expected)
- UI must handle NULL gracefully

### Task 2 Security Impact
- Incident cancellation requires Reporter verification
- Must add PIN/OTP verification flow
- Checklist cancellation simpler (creator/admin only)
- All cancellations logged in system_audit_logs

### Task 1 UI Logic
- Filter: users.filter(u => u.role === selectedRole)
- When role changes, clear approver_id if not matching new role
- Handle Dynamic Roles (reporter, creator) - show all users for these

---

## 📝 Testing Checklist

- [ ] Workflow Settings: Filter users by role works correctly
- [ ] Workflow Settings: Dynamic roles show all users
- [ ] Cancel Checklist: Can cancel with proper permissions
- [ ] Cancel Incident: PIN/OTP verification required
- [ ] Checklist Detail: Start time input works (DD/mmm/yyyy HH:mm)
- [ ] Checklist Detail: Duration input works (HH:mm)
- [ ] Checklist Detail: End time auto-calculates correctly
- [ ] Checklist Detail: OK/NG evaluation per item
- [ ] Procedure Editor: Label changed correctly
- [ ] All npm tests pass (12/12)
- [ ] Build successful

---

Created: May 25, 2026
Status: Ready for Implementation
