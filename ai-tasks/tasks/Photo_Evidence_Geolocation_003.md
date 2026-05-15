# Photo_Evidence_Geolocation_003: Geolocation Requirement for Photo Evidence (Optional Phase)

## Objective
Define the optional geolocation feature for photo evidence in the Checklist Template Master Asset History workflow.

## Decision (Confirmed)
- Geolocation will be **optional** during the first development phase.
- When enabled, the UI will display a toggle to capture location; otherwise, it will be hidden.

## Scope
- Extend the photo capture component (`components/PhotoCapture.tsx`) to request the browser's geolocation API when the toggle is active.
- Store latitude/longitude in the `photo_evidence` table (add nullable columns `lat` and `lng`).
- Ensure server‑side validation allows null values.
- UI badge indicates whether location is captured.

## Acceptance Criteria
1. Photo capture UI includes a switch "Attach Location".
2. When toggled on, the app requests permission and stores coordinates alongside the photo.
3. Coordinates are optional; inspections can be saved without them.
4. All UI follows premium design guidelines.
5. Database schema update is reflected in Supabase types.

## Implementation Steps
1. Add nullable `lat` and `lng` columns via a Supabase migration (`add_geolocation_to_photo_evidence.sql`).
2. Update Supabase client types (`supabase_types.ts`).
3. Modify `PhotoCapture` component to handle the toggle and call `navigator.geolocation.getCurrentPosition`.
4. Adjust server action that persists photo evidence to include optional location fields.
5. Write unit tests for the toggle logic and migration.
6. Add Playwright test to verify UI behavior when permission is granted/denied.

## Documentation
- Update `docs/standards/DOCUMENT_MAPPING_STANDARD.md` with the new fields.
- Add a section to `docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md` describing the optional geolocation feature.

## Estimated Effort
- Backend migration & types: 3 h
- UI component changes: 4 h
- Testing: 3 h
- Documentation: 1 h

---
*Created by Antigravity on 2026‑05‑14.*
