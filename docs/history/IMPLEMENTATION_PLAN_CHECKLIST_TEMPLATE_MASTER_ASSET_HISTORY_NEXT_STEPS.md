# Next Steps for Checklist Template Master & Asset History

## Pending Tasks (Phase 3‑6)

- [x] **Implement Target Registry UI**
  - Create route `/dashboard/settings/target-registry` with list/create/edit pages.
  - Build client components: `TargetListClient.js`, `TargetFormClient.js`, `TargetGroupListClient.js`.
- [x] **Add server‑side actions for Target CRUD** (`app/actions/target.js`).
- [x] **Extend checklist generation logic** (`app/actions/checklist-template.js`) to support `scope_mode = per_target` and `per_group` (see pseudocode lines 494‑505).
- [x] **Implement QR‑scan flow**:
  - API route `/api/qr/lookup/route.js` to resolve `qr_value` → `target_id`.
  - Page `/dashboard/checklist/targets/[id]` with timeline, gallery, incident panel.
- [x] **Refactor static template fallback**:
  - Remove `CHECKLIST_TEMPLATES` from `lib/checklistItems.js`.
  - Update `app/dashboard/checklist/page.js` to query `checklist_templates` only.
- [x] **Extend validation schemas** (`lib/checklistTemplateValidation.js`, `lib/procedurePlanValidation.js`) to include new fields (`scope_mode`, `target_type`, `validation_rules`, `incident_rules`).
- [x] **Write unit & integration tests** for:
  - Migrations & new tables.
  - Per‑target checklist generation.
  - QR lookup & Asset History page.
- [x] **Update documentation**:
  - Add standards for new tables in `docs/standards/TARGET_REGISTRY.md`.
  - Add API docs for QR lookup in `docs/standards/QR_ASSET_HISTORY.md`.
  - Update `docs/INDEX.md` with links.
- [x] **Record each completed step** in `docs/history/CHANGELOG.md` with timestamps.

## Recommended Next Phase

1. **Refactor Asset History data loading to server-side flow**
   - ✅ Replace client-side direct Supabase reads in `app/dashboard/checklist/targets/[id]/page.js`
   - ✅ Move data access into Server Action or Route Handler to align with project standards via `getTargetAssetHistory()`
2. **Harden QR lookup route for production**
   - ✅ Standardize imports and environment-safe module resolution
   - ✅ Add explicit response branches for not found vs internal error
3. **Add seed/demo data for Target Registry UAT**
   - Prepare 3-5 sample targets such as `CCTV Terminal Box`
   - Verify end-to-end flow: target mapping → checklist generation → QR lookup → asset history timeline
4. **Close documentation loop**
   - ✅ Update main implementation history to mark Target Registry migration/test phase as completed
   - ✅ Update user task tracker to move Target Registry / QR Asset History from pending to next execution phase

## Priority Order
1. Target Registry UI & API
2. Checklist generation enhancements
3. QR‑scan & Asset History page
4. Static fallback refactor
5. Validation & tests
6. Documentation & changelog
