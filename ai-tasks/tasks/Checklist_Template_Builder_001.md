# Checklist_Template_Builder_001: Checklist Template Builder UI/UX & Save Logic

## Objective
Develop a premium, responsive UI for the Checklist Template Builder (Template Master) with full save functionality.

## Scope
- Implement the UI in `app/dashboard/settings/checklist-template-builder` as a **client component** (`"use client"`).
- Use Tailwind CSS v4 with the project design system (`cn()` from `clsx/tailwind-merge`).
- Provide a **preview panel** that renders the template in real‑time.
- Add server actions to **validate** and **persist** the template configuration to Supabase.
- Ensure the page follows the **Settings Design System** (cards, gradients, micro‑animations).

## Acceptance Criteria
1. A dedicated route `/dashboard/settings/checklist-template-builder` renders the builder page.
2. The UI includes:
   - Header with title and help tooltip.
   - Form sections for each template type (T0‑T5) with validation.
   - Live preview area showing a rendered checklist preview.
   - Save button that triggers a server action and displays success/error toast.
3. All components are fully responsive (mobile‑first) and use the **premium design** guidelines.
4. Server‑side code validates `template_config` against the schema defined in `docs/standards/DOCUMENT_MAPPING_STANDARD.md`.
5. Tests exist for the server action (unit test using Vitest) and UI snapshot tests (Playwright).

## Implementation Steps
1. Create the folder `app/dashboard/settings/checklist-template-builder`.
2. Add `page.tsx` (client component) with the UI layout.
3. Add `components/TemplateForm.tsx` and `components/TemplatePreview.tsx`.
4. Implement server actions in `app/actions/checklist-template.ts`.
5. Write validation schema in `lib/validation.ts`.
6. Add Tailwind config utilities if needed.
7. Write unit tests (`__tests__/checklist-template.test.ts`).
8. Add Playwright visual regression test.

## Dependencies
- `clsx`, `tailwind-merge`
- `zod` for validation
- Supabase client (server side) generated types.

## Documentation
- Update `docs/standards/DOCUMENT_MAPPING_STANDARD.md` with the new template schema.
- Add a link in `docs/history/IMPLEMENTATION_PLAN_CHECKLIST_TEMPLATE_MASTER_ASSET_HISTORY.md` referencing this task.

## Estimated Effort
- UI & layout: 8 h
- Server actions & validation: 6 h
- Testing: 4 h
- Documentation: 2 h

---
*Created by Antigravity on 2026‑05‑14.*
