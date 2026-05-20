-- Migration: Add Target Registry tables and extend existing checklist tables
-- Generated on 2026-05-14

-- 1. Extend existing tables
ALTER TABLE checklist_templates
  ADD COLUMN scope_mode TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN target_type TEXT,
  ADD COLUMN config_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN validation_rules JSONB,
  ADD COLUMN incident_rules JSONB;

ALTER TABLE checklist_docs
  ADD COLUMN target_id UUID,
  ADD COLUMN target_type TEXT,
  ADD COLUMN history_scope TEXT;

ALTER TABLE checklist_items
  ADD COLUMN target_id UUID,
  ADD COLUMN target_snapshot JSONB,
  ADD COLUMN checked_at TIMESTAMPTZ,
  ADD COLUMN evidence_summary JSONB;

-- 2. Create new tables for Target Registry
CREATE TABLE checklist_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_code TEXT NOT NULL,
  target_type TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  qr_value TEXT NOT NULL UNIQUE,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checklist_target_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  target_type TEXT NOT NULL,
  description TEXT
);

CREATE TABLE checklist_template_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  target_id UUID REFERENCES checklist_targets(id) ON DELETE CASCADE,
  target_group_id UUID REFERENCES checklist_target_groups(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  override_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Indexes for performance
CREATE INDEX idx_checklist_items_target_id ON checklist_items(target_id);
CREATE INDEX idx_checklist_targets_qr_value ON checklist_targets(qr_value);
-- Assuming checklist_docs has a period_date column for history queries
CREATE INDEX IF NOT EXISTS idx_checklist_docs_period_date ON checklist_docs(period_date);

-- End of migration
