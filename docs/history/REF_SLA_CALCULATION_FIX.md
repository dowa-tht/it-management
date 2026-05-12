# 🛠️ Hand-off Plan: SLA Standards & Configuration Overhaul (v2 - Strict Mode)

This document serves as a detailed instruction for the next Agent to implement the SLA changes. This version includes **Strict Mode** for real-time accuracy.

---

## 🎯 Objectives
1.  **Correct SLA Calculations**: Update thresholds (High: 60/240, Medium: 120/480, Low: 360/1620).
2.  **Strict Mode Logic**: Count late Open/In-Progress tickets as **FAIL** in real-time.
3.  **Dynamic Setup UI**: Enhance the SLA Guide Modal to allow Hour/Minute setup.
4.  **Display Refinement**: Show durations in Thai format (e.g., "0 ชั่วโมง 40 นาที").

---

## 📏 New SLA Standards (Mandatory)

| Severity | Response Target | Resolution Target |
| :--- | :--- | :--- |
| **High** | 60 min | 240 min |
| **Medium** | 120 min | 480 min |
| **Low** | 360 min (6h) | 1,620 min (3 working days) |

---

## 🛠️ Implementation Instructions (For Agent)

### 1. Utility Refactoring (`lib/slaUtils.js`)
- Update `SLA_LIMITS` and `calculateSLARates`.
- **Logic Change**: Ensure the rates count all items where `isResponseOK !== null`.

### 2. Backend Logic Update (`app/actions/reports.js` & `dashboard.js`)
- **Strict Response Logic**:
  ```javascript
  const currentMin = calculateNetBusinessMinutes(inc.created_at, null, wh, holidays, []);
  if (inc.status === 'Open') {
    inc.isResponseOK = currentMin > respLimit ? false : null;
  } else {
    inc.isResponseOK = responseMin <= respLimit;
  }
  ```
- **Strict Resolution Logic**:
  ```javascript
  const currentResMin = calculateNetBusinessMinutes(inc.created_at, null, wh, holidays, incExclusions);
  if (inc.status !== 'Closed') {
    inc.isResolveOK = currentResMin > resLimit ? false : null;
  } else {
    inc.isResolveOK = resolveMin <= resLimit;
  }
  ```

### 3. Dashboard UI Enhancement (`app/dashboard/reports/sla/page.js`)
- **Modal Update**: 
    - Convert minutes to Hour/Minute inputs.
    - Total Minutes = `(H * 60) + M`.
    - Format all duration displays using `formatDurationThai`.
- **Status Badges**: Ensure "FAIL" badges appear for late Open/In-Progress tickets.

### 4. Documentation Update
- **File**: `docs/standards/SLA_MANAGEMENT.md`
- **Action**: Verify it matches the latest "Strict Mode" formulas.

---

---

## 📊 Current Implementation Status (Audit: 2026-05-09)

- [x] **Thresholds Update**: `SLA_LIMITS` updated in `lib/slaUtils.js`.
- [x] **UI Unit Conversion**: SLA Guide Modal handles H/M to Minute conversion.
- [x] **Thai Formatting**: All displays use `formatDurationThai`.
- [ ] **Strict Mode Calculation**: `app/actions/reports.js` still returns `null` for Open/In-Progress cases instead of checking against `new Date()`.

> [!IMPORTANT]
> **Technical Gap**: In `app/actions/reports.js`, the logic for `isResponseOK` and `isResolveOK` must be updated to use `calculateNetBusinessMinutes(inc.created_at, new Date(), ...)` for non-closed tickets to enable real-time "FAIL" badges.

---

## ✅ Verification Checklist
- [ ] **Strict Mode**: Open tickets that were created more than X hours ago (per severity) show a "FAIL" badge on the dashboard.
- [ ] **Real-time Accuracy**: The Response Rate (%) at the top decreases *immediately* when a new ticket is opened and left unacknowledged beyond the limit.
- [x] **Setup UI**: Verified that Setup UI correctly handles conversion between (H:M) and total minutes.
