# Target Registry Standards

## Overview
The Target Registry introduces three new tables to support asset‑aware checklists and QR‑based navigation:

- **checklist_targets** – stores each physical asset/target.
- **checklist_target_groups** – groups of targets for bulk checklist assignment.
- **checklist_template_targets** – many‑to‑many mapping between checklist templates and targets or groups.

All tables include the new columns `scope_mode`, `target_type`, `validation_rules`, `incident_rules` to allow fine‑grained control over which checklist templates apply to which assets.

## Schema
| Table | Column | Type | Description |
|-------|--------|------|-------------|
| checklist_targets | id | uuid (PK) | Unique identifier for the target |
|  | target_code | text | Human‑readable code (e.g., `CCTV-001`) |
|  | target_type | text | Type of asset (e.g., `cctv_terminal`) |
|  | qr_value | text | QR code value used for lookup |
|  | target_snapshot | jsonb | Optional snapshot of static data |
| checklist_target_groups | id | uuid (PK) | Unique identifier for the group |
|  | group_name | text | Name of the group |
|  | description | text | Optional description |
| checklist_template_targets | id | uuid (PK) | Unique identifier |
|  | template_id | uuid (FK → checklist_templates.id) | Linked template |
|  | target_id | uuid (FK → checklist_targets.id) | Target this template applies to |
|  | target_group_id | uuid (FK → checklist_target_groups.id) | Group this template applies to |
|  | scope_mode | enum('global','per_target','per_group') | Determines the scope of the template |

## Usage Examples
```sql
-- Find all templates that apply to a specific target
SELECT ct.*
FROM checklist_templates ct
JOIN checklist_template_targets ctt ON ct.id = ctt.template_id
WHERE ctt.target_id = '123e4567-e89b-12d3-a456-426614174000'
  AND ctt.scope_mode = 'per_target';
```

```js
// Server‑side action to fetch templates for a target
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
export async function getTemplatesForTarget(targetId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('checklist_template_targets')
    .select('template_id')
    .eq('target_id', targetId)
    .eq('scope_mode', 'per_target');
  if (error) throw new Error(error.message);
  return data.map(d => d.template_id);
}
```

## Validation
The new fields are validated in `lib/checklistTemplateValidation.js` and `lib/procedurePlanValidation.js` with Zod schemas (`scope_mode`, `target_type`, `validation_rules`, `incident_rules`).

---
*Last updated: 2026‑05‑14*