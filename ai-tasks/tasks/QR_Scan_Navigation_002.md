# QR_Scan_Navigation_002: QR‑Scan Navigation Behavior

## Objective
Define and implement the QR‑scan navigation flow for the Checklist Template Master Asset History feature.

## Decision (Confirmed)
- When a QR code is scanned, the app should open the **Asset History** page for the corresponding box **first**.
- The Asset History page must include a clearly visible **"Start New Inspection"** button that navigates to the checklist creation flow.

## Scope
- Update the QR‑scan handler (likely in `app/dashboard/settings/asset-history/qr-scan.ts` or a related client component).
- Ensure the navigation uses Next.js router (`useRouter`) to push to `/dashboard/settings/asset-history/[boxId]`.
- Add a button component on the Asset History page that links to `/dashboard/settings/checklist-template-builder?boxId=[boxId]`.
- Apply premium UI styling per the Settings Design System (gradient header, card‑style button, micro‑animation on hover).

## Acceptance Criteria
1. Scanning a QR code for a box redirects to the correct Asset History route.
2. The Asset History page displays the box details and a **Start New Inspection** button.
3. Clicking the button opens the Checklist Template Builder pre‑filled with the box ID.
4. All navigation is client‑side and type‑safe (TypeScript). Errors are handled with a toast notification.
5. UI matches the premium design guidelines (responsive, animated, accessible).

## Implementation Steps
1. Locate the QR‑scan component and add a conditional navigation to the Asset History page.
2. Create/modify `app/dashboard/settings/asset-history/[boxId]/page.tsx` (client component) to render box info and the button.
3. Add a reusable `StartInspectionButton` component with Tailwind styling.
4. Update any server actions if required to fetch box metadata.
5. Write unit tests for the navigation logic and component rendering.
6. Add Playwright test to verify QR‑scan flow directs correctly.

## Documentation
- Add a section to `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md` describing the QR‑scan navigation pattern.
- Reference this task in `docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md`.

---
*Created by Antigravity on 2026‑05‑14.*
