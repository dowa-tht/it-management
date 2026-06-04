# DOWA IT System

## Overview

DOWA IT System เป็นระบบจัดการงาน IT ภายในองค์กร ครอบคลุมโมดูลหลัก เช่น Incident Management, IT Checklist, Workflow & Approval, Settings และ Reporting

## Tech Stack

- Next.js App Router
- React
- Supabase
- Tailwind CSS v4
- Zod

## Run

```bash
npm install
npm run dev
```

สำหรับ production build:

```bash
npm run build
npm start
```

## Test

```bash
npm test
```

## Project Structure

```text
app/                  Next.js routes, pages, server actions, API routes
components/           shared UI components
lib/                  shared business logic and utilities
docs/                 standards, history, manuals
supabase/migrations/  database migrations
scripts/              maintenance and migration helper scripts
tests/                automated tests
ai-tasks/             AI workflow area for temporary task execution inputs
```

## Notes

- ใช้ App Router เท่านั้น
- การเปลี่ยนแปลงเชิง business logic, workflow, security, หรือ database ต้องอ้างอิงมาตรฐานใน [`AGENTS.md`](AGENTS.md) และเอกสารใน [`docs/`](docs)
- เอกสารกำกับวิธีทำงานหลัก เช่น [`docs/standards/WINDSURF.md`](docs/standards/WINDSURF.md) และ [`docs/standards/FUNCTION_REGISTRY.md`](docs/standards/FUNCTION_REGISTRY.md) ถือเป็น canonical governance docs ของโปรเจกต์
