# TASK-003 — Verify and Apply Settings RLS Migration

## Workflow Metadata
- **Model Role:** Fast AI
- **Input:** `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md`
- **Status:** Ready for Execution with Human/Environment Gate
- **Priority:** P0
- **Scope:** RLS verification for Settings-related tables, especially checklist procedure plans and holidays

## Objective
Verify the real database schema and RLS state, then apply the existing RLS migration only if the schema and policy targets match the live database.

This task touches database security. Do not apply migrations blindly.

## Important Ambiguity
> [!IMPORTANT]
> `docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md:L55` names `holiday_masters`, but the application and migration use `holidays`.
>
> Fast AI must verify the actual Supabase schema before applying any migration. If both tables exist, or if only `holiday_masters` exists in the target database, stop and escalate. Do not rename or alias table names in UI or SQL as a workaround.

## Evidence From Current Code
- `app/dashboard/settings/holidays/page.js:L73` reads from `holidays`.
- `app/dashboard/settings/holidays/page.js:L106-L132` writes to `holidays`.
- `app/dashboard/settings/_components/MasterDataScope.js:L201-L211` reads `checklist_procedure_plans`.
- `app/dashboard/settings/_components/MasterDataScope.js:L395` inserts into `checklist_procedure_plans`.
- `supabase/migrations/add_rls_policies.sql:L156` enables RLS on `public.holidays`.
- `supabase/migrations/add_rls_policies.sql:L163` enables RLS on `public.checklist_procedure_plans`.
- `supabase/migrations/add_rls_policies.sql:L355-L363` creates admin/read policies for `public.holidays`.
- `supabase/migrations/add_rls_policies.sql:L384-L392` creates admin/read policies for `public.checklist_procedure_plans`.

## Standards To Follow
- `docs/standards/ZERO_HACK_POLICY.md:L6` requires source-of-truth fixes and prohibits UI display hacks.
- `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md:L56` requires migration/source fixes when data or status does not match standards.
- Project Supabase rules require checking RLS policy before query and never exposing `service_role` keys client-side.

## Files In Scope
- `supabase/migrations/add_rls_policies.sql`
- Optional new SQL verification note under `docs/history/` only if the schema mismatch must be documented
- Do not edit UI files unless the verified schema proves the app is pointing to the wrong table and Smart AI/Human approves that logic change

## Required Technical Logic
1. Verify live table existence:
   ```sql
   select table_name
   from information_schema.tables
   where table_schema = 'public'
     and table_name in ('holidays', 'holiday_masters', 'checklist_procedure_plans');
   ```
2. Verify live RLS state:
   ```sql
   select schemaname, tablename, rowsecurity
   from pg_tables
   where schemaname = 'public'
     and tablename in ('holidays', 'holiday_masters', 'checklist_procedure_plans');
   ```
3. Verify existing policies:
   ```sql
   select schemaname, tablename, policyname, cmd, roles
   from pg_policies
   where schemaname = 'public'
     and tablename in ('holidays', 'holiday_masters', 'checklist_procedure_plans')
   order by tablename, policyname;
   ```
4. Decision tree:
   ```text
   IF holidays exists AND checklist_procedure_plans exists AND holiday_masters does not exist:
       migration table names align with app code
       apply/simulate add_rls_policies.sql according to environment process
   ELSE IF holiday_masters exists:
       ESCALATE before migration
   ELSE IF checklist_procedure_plans missing:
       ESCALATE before migration
   ELSE:
       ESCALATE with schema evidence
   ```
5. After migration, re-run RLS and policy verification queries.

## Human/Environment Gate
Fast AI must not run production database migration without explicit Human approval and the correct environment target.

Acceptable actions without approval:
- Read migration SQL
- Prepare verification SQL
- Run local/static checks if no production credentials are touched

Requires Human approval:
- Applying migration to Supabase
- Using production database credentials
- Changing migration table names

## Validation Checklist
- [ ] Actual schema table names are documented in the report.
- [ ] RLS state is verified before migration.
- [ ] Existing policy state is verified before migration.
- [ ] Migration is applied only if schema matches.
- [ ] RLS state is verified after migration.
- [ ] Policy state is verified after migration.
- [ ] Any mismatch is escalated rather than patched with UI logic.

## Expected Fast AI Report
```text
TASK-003 Result
Status: Pass / Fail / Escalate
Files Changed:
- ...
Schema Evidence:
- ...
RLS Evidence:
- ...
Validation:
- ...
```

