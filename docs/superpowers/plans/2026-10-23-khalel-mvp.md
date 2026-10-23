# Khalel Insight AI Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans, with independent backend and public-UI work delegated according to superpowers:dispatching-parallel-agents. The user has authorized implementation in the supplied brief.

**Goal:** Deliver a functional anonymous feedback-to-resolution MVP with bilingual UI and an honest local demo.
**Architecture:** Next.js server routes expose a typed API consumed by public and admin client components. Server-only demo and Supabase repositories share the types in `src/lib/types.ts`. Production keys never enter client imports.
**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind 4, shadcn-style Radix primitives, next-intl, Motion, Recharts, Supabase, OpenAI, Zod, Vitest, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-23-khalel-design.md` and the user's complete attached master prompt.

## Global constraints
- Russian and Kazakh; no raw complaints or internal metadata in public responses.
- Server-granted admin roles. Explicit demo mode. No secrets in tracked files.
- Hashed random tracking code, consent, PII redaction, rate limits and server validation.
- Never auto-merge, close, or make final priority decisions using AI.

## Review focus
- Forged client role/cookie cannot access administration (authorization/API tests).
- Missing AI consent never calls the provider (AI unit tests).
- Public output hides singleton groups and internal fields (repository tests).
- Admin status/membership updates persist and change tracking/analytics (workflow tests).
- Kazakh, validation errors, mobile forms, and API errors remain usable (Playwright).

### 1. Foundation and contracts
- [x] Create strict project config, reusable UI primitives, localized shell, and shared domain types.
- [x] Install compatible dependencies and retain pnpm lockfile.
### 2. Server workflow
Files: `src/lib/server/**`, `src/app/api/**`, `supabase/**`, `tests/server*.test.ts`.
- [x] First write/run failing validation, token, redaction, publication, authorization and persistence tests.
- [x] Implement demo SQLite seed and repository, Supabase repository, auth, rate limits and request safety.
- [x] Implement feedback/tracking/admin APIs against `src/lib/types.ts`.
- [x] Add OpenAI structured classification/embeddings and explicit demo heuristic suggestions.
- [x] Add database migrations, RLS tests, indexes, audit events, public privacy protections.
- [x] Run tests to confirm core server behavior.
### 3. Public experience
Files: `src/components/public/**`, public `src/app` routes, `src/messages/public-*.json`.
- [x] Implement original landing, submission, tracking, login, privacy, and public progress screens.
- [x] Multi-step RHF/Zod form, distinct consents, tracking receipt and error states.
- [x] Use next-intl throughout and clearly label demo mode.
### 4. Administrator workspace
Files: `src/components/admin/**`, `src/app/admin/**`, `src/messages/admin-*.json`.
- [x] Implement protected shell, overview, trends, category and role breakdowns from returned records.
- [x] Add category/status/date/search filters; report review, explicit issue creation and membership changes.
- [x] Add issue details, owner, priority, status, resolution notes, AI review and history.
### 5. Verification and handoff
- [x] Run lint, typecheck, Vitest, Next.js build, Playwright core/authorization/mobile/localization flows.
- [x] Review rendered desktop/mobile pages and fix observed problems.
- [x] Independent code review focused on privacy, persistence, authorization, deployment correctness.
- [x] Write README, .env.example, local demo walkthrough, production prerequisites and known limits.

## API contract
- `POST /api/feedback` FeedbackInput → `{trackingCode, reference, analysisStatus}`.
- `POST /api/track` `{code}` → TrackingResult.
- `POST /api/auth/login` `{demo:true}` or `{email,password}` → `{ok:true}`. `POST /api/auth/logout`.
- `GET /api/issues` → `{issues:PublicIssue[],demo:boolean}`.
- `GET /api/admin/overview` → AdminSnapshot.
- `GET /api/admin/issues/[id]` → IssueDetail.
- `POST /api/admin/issues` `{submissionId,title,category}` → `{id}`.
- `PATCH /api/admin/issues/[id]` partial `{title,category,status,priority,owner,publicSummary,published,resolutionNote}` → `{ok:true}`.
- `POST /api/admin/issues/[id]/members` `{submissionId,action:'add'|'remove'}` → `{ok:true}`.
- `POST /api/admin/submissions/[id]/analysis` → `{ok:true}`.
- `POST /api/admin/submissions/[id]/review` `{category,summary,urgency}` → `{ok:true}`.
- Error envelope `{error: string}` with stable translation keys and appropriate HTTP status.
- `src/lib/server/config.ts` exports `isDemoMode(): boolean`; `auth.ts` exports `getAdminSession(): Promise<AdminSession|null>`.

## Execution ledger
- Initial repository: no commits or files, origin configured. No preexisting code or tests to preserve.
- User already specifies the stack, scope and execution order; proceed without additional approval gates.

- Verification: 34 Vitest tests, 4 Playwright scenarios, ESLint, TypeScript and Webpack production build passed. Browser verified Russian/Kazakh switching and demo login. Supabase RLS and live AI require credentials and are not claimed tested.
