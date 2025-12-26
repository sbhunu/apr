# Copilot / AI Agent Instructions for this repository

This file gives concise, project-specific guidance so an AI coding agent can be immediately productive.

## Big picture
- This is a Next.js 16 app-router frontend with a Supabase-backed data layer (Postgres + PostGIS). Key paths: `app/` (routes & UI), `components/`, `lib/` (service helpers like `lib/supabase`), and `supabase/migrations/` (SQL migrations).
- Spatial functionality (PostGIS/proj4/leaflet) and Supabase RLS are first-class concerns — preserve SRIDs and geometry handling in edits (see `types/spatial.ts` and `lib/*/spatial`).

## Developer workflows (commands you should use)
- Development server: `npm run dev` (runs `next dev`).
- Build: `npm run build` and `npm run start` for production serve.
- DB migrations: `npm run migrate` (runs `scripts/run-migrations-docker.sh`) — use this for applying SQL in `supabase/migrations/`.
- Show migrations: `npm run migrate:show`.
- Generate TypeScript types from migrations: `npm run types:generate` (and `types:watch` for a watcher tied to SQL changes).
- Run targeted verification tests: `npm run test:verify` or specific scripts like `npm run test:foundation` and `npm run test:schema` (many test entrypoints live in `tests/`).
- End-to-end UI tests: `npm run test:e2e` (Playwright). Use `--ui`/`--debug` flags as needed.
- Run small TS scripts: use `npx tsx scripts/<script>.ts` — many `scripts/` rely on `tsx`.

## Project-specific conventions & patterns
- Task/agent orchestration: this repo embeds Cursor/Taskmaster rules under `.cursor/rules/*.mdc`. Respect those rule files (e.g. `nextjs-best-practices.mdc`, `supabase-best-practices.mdc`, `taskmaster/dev_workflow.mdc`) — they encode project expectations and agent workflows.
- Use App Router conventions in `app/` (server components, edge/middleware patterns). See `middleware.ts` and `app/layout.tsx` for global layout and error handling.
- Supabase integration patterns: use `lib/supabase/*` and server API routes under `app/api/` rather than direct client-side DB calls for sensitive ops. Environment keys live in `.env` for CLI and `.cursor/mcp.json` for MCP/Cursor integrations.
- Types and geometry: prefer canonical types in `types/` and update `types:generate` after DB schema changes.
- Error handling: project uses `lib/api-error-handler.ts` and `lib/logger.ts` — follow those helpers for consistent responses and logs.

## Integration points & external dependencies
- Supabase (see `lib/supabase` and `supabase/README.md`); RLS is enabled — don't bypass Row-Level Security in migrations or API code.
- PostGIS/geometry: watch for coordinate transforms (proj4) and WKT/WKB conversions (`wellknown` package and `types/spatial.ts`).
- Playwright for e2e and `tsx` for running TypeScript scripts.

## Editing guidance & common tasks examples
- When adding DB fields: add migration SQL under `supabase/migrations/`, run `npm run migrate`, then `npm run types:generate` and update any `types/` consumers.
- When changing API behavior: update `app/api/*` endpoints and corresponding tests in `tests/` (there are targeted tests like `tests/verify-*.test.ts`).
- When introducing UI components: add under `components/<area>/` (e.g., `components/deeds/`, `components/survey/`) and update usages in `app/` routes.

## Tests & verification (what to run after changes)
- Run focused tests first, e.g. `npm run test:validation` or `npm run test:foundation` depending on the area changed.
- For full verification, run `npm run test:verify` which aggregates many verification scripts.
- If UI changes affect flows, run Playwright: `npm run test:e2e`.

## Where to look for style/rules for AI agents
- `.cursor/rules/` contains explicit agent-facing rules (format: front-matter + bullets). Examples: `nextjs-best-practices.mdc`, `supabase-best-practices.mdc`, `typescript-best-practices.mdc`.
- Task/agent orchestration details live in `.cursor/rules/taskmaster/dev_workflow.mdc` — follow its Taskmaster patterns (tagging, expand/update_subtask logs) when the user expects task-managed changes.

## Safety checks and non-goals
- Do not change RLS policies or drop PostGIS SRIDs silently. Migrations touching security or geometry must be explicit and backed by tests.
- Avoid broad refactors without updating tests and `types:generate` output.

## Quick references
- Migrations: `supabase/migrations/` and `npm run migrate`
- Types: `npm run types:generate`
- Scripts: `scripts/` (migration helpers, migration extraction, test harnesses)
- Agent rules: `.cursor/rules/*.mdc`
- Tests: `tests/` and `tests/e2e/`

---
If anything here is unclear or you want the instructions to emphasize a different area (migrations, testing, or agent rules), tell me which part to expand and I'll update this file.
