# Implementation Plan – Next Steps (Checklist)

## Overview
All open decisions have been accepted (see lines 766‑770). The following tasks must be completed to move from Phase 3 to Phase 6.

## Tasks

- [x] Create migration script `scripts/migration_target_registry.sql` to add tables `checklist_targets`, `checklist_target_groups`, `checklist_template_targets` and new columns to existing tables (`scope_mode`, `target_type`, `config_version`, `validation_rules`, `incident_rules`, `target_id`, `target_snapshot`, `checked_at`, `evidence_summary`). Include indexes on `target_id`, `qr_value`, `period_date`.
- [x] Apply migration using Supabase CLI or `psql` (`mcp--supabase--apply_migration`) — manually applied in Supabase SQL Editor on 2026-05-15; verified existence of tables `checklist_targets`, `checklist_target_groups`, `checklist_template_targets`, required columns, and indexes `idx_checklist_docs_period_date`, `idx_checklist_items_target_id`, `idx_checklist_targets_qr_value`.
- [x] Implement Target Registry UI:
  - Route `/dashboard/settings/target-registry` with list/create/edit pages.
  - Components: `TargetListClient.js`, `TargetFormClient.js`, `TargetGroupListClient.js`.
- [x] Add server‑side actions for target CRUD (`app/actions/target.js`).
- [x] Extend checklist generation logic (`app/actions/checklist-template.js`) to handle `scope_mode = per_target` and `per_group` per pseudocode lines 494‑505.
- [x] Implement QR scan flow:
  - API route `/api/qr/lookup/route.js` to resolve `qr_value` to `target_id`.
  - Page `/dashboard/checklist/targets/[id]` with timeline, gallery, incident panel (see sections 9.3, 280‑306).
- [x] Refactor static template fallback:
  - Remove `CHECKLIST_TEMPLATES` from `lib/checklistItems.js`.
  - Update `app/dashboard/checklist/page.js` to query `checklist_templates` only.
- [x] Extend validation schemas (`lib/checklistTemplateValidation.js`, `lib/procedurePlanValidation.js`) to include new fields (`scope_mode`, `target_type`, `validation_rules`, `incident_rules`).
- [x] Write unit and integration tests for:
  - Migrations and new tables.
  - Per‑target checklist generation.
  - QR lookup and Asset History page.
- [x] Update documentation:
  - Add standards for new tables in `docs/standards/TARGET_REGISTRY.md`.
  - Add API docs for QR lookup in `docs/standards/QR_ASSET_HISTORY.md`.
  - Update `docs/INDEX.md` with links.
- [x] Record each completed step in `docs/history/CHANGELOG.md` with timestamp.

## Priority Order
1. Migrations
2. Target Registry UI & API
3. Per‑target checklist generation
4. QR scan & Asset History page
5. Refactor static fallback
6. Validation & tests
7. Documentation & changelog
