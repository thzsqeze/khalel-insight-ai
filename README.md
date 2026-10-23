# Khalel Insight AI

«Университет, который слышит каждого» — bilingual feedback and issue-resolution MVP for the community of Khalel Dosmukhamedov Atyrau University. This is a prototype, not an official university service.

## Show the demo

Requirements: Node.js **22.13+** (Node 24 recommended), pnpm 11.

```bash
pnpm install
pnpm demo
```

Open **http://localhost:3000**. No accounts, paid API keys, or external database are needed. Demo mode is explicit; `pnpm dev` without `DEMO_MODE=true` uses the production configuration instead.

1. Open `/` for the landing page, or `/login` and select **«Войти в демо-кабинет»**.
2. Explore `/admin`: stored synthetic reports, charts, categories, and active/resolved issue counts.
3. Open `/submit`, choose student/teacher, describe a problem, and provide privacy consent. AI consent is separate and optional.
4. Save the private code displayed on the receipt. Enter it on `/track`; it is never included in URLs or stored in plaintext on the server.
5. In `/admin/issues`, choose **«Без группы»**, expand the report, review the explicitly labeled demo AI suggestion, and create an issue.
6. Open the issue, assign an internal owner, change status, and save. A resolution note is required to mark an issue resolved. The tracking page and analytics reflect saved changes.
7. Review suggested related reports and explicitly add/remove membership. Nothing merges automatically.
8. Switch **РУС / ҚАЗ**. `/issues` shows only reviewed public summaries with at least three associated reports.

The SQLite database is automatically seeded with **64 fictional reports across 9 issues**, including six ungrouped reports. Data and the signing secret persist in `.data/demo.sqlite`. To start a separate demo, set `DEMO_DB_PATH=.data/another-demo.sqlite`. Demo similarity scores are illustrative category matches, not real semantic embeddings. The landing preview is also explicitly illustrative.

## Implemented

- Responsive landing, multi-step feedback, receipt/copy/download, private tracking, login, public progress, privacy page.
- Server-protected administrator dashboard, filters, report review, issue grouping/separation, ownership, status, priority, internal resolution notes, and history.
- Analytics computed from stored records, including categories, trends, role breakdowns and resolution progress.
- Russian/Kazakh localization with next-intl and a locale cookie; bundled Inter font, Tailwind and reusable shadcn-style primitives, Lucide, Motion and Recharts.
- Zod validation, React Hook Form, honeypot, request-size checks, durable rate limiting, same-origin checks, hashed 192-bit tracking tokens, and server-only secrets.
- Separate Supabase production repository, Supabase Auth role checks, PostgreSQL migration with RLS/audit/atomic mutations and pgvector similarity.
- Consent-gated OpenAI structured classification and embeddings with local redaction, validated output, failure handling and explicit administrator retry.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
DEMO_MODE=true pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Vitest covers analytics, input validation, privacy/redaction, authorization, request boundaries, persistence, tracking, publication thresholds and rate limits. SQL RLS assertions are in `supabase/tests/rls.sql`; they require a real migrated Supabase database and are separate from Vitest.

The build uses Next.js's supported Webpack compiler because Turbopack's build-time worker port is blocked in some restricted desktop environments. Development still uses Turbopack. Playwright starts an isolated demo on port 3100, or uses `PW_BASE_URL` when supplied.

## Production / Vercel

1. Apply `supabase/migrations/202610230001_initial.sql` to an empty Supabase application schema.
2. Copy `.env.example` to `.env.local` for local configuration, or set the corresponding Vercel environment variables.
3. Set `DEMO_MODE=false`, the exact HTTPS `APP_ORIGIN`, Supabase URL/anon key, and the **server-only** service role key.
4. Create a trusted Supabase Auth administrator identity and assign `profiles.role='admin'` using an operator SQL connection. Clients cannot grant themselves roles. There is no public administrator registration.
5. Set a random `RATE_LIMIT_SALT`. Configure `TRUSTED_IP_HEADER` only for a header your ingress overwrites (on Vercel, `x-vercel-forwarded-for`). Otherwise clients share a conservative global bucket.
6. For live AI, set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_EMBEDDING_MODEL`. Missing or failed AI does not discard feedback. Production never substitutes synthetic analysis.
7. Import the repository into Vercel as a Next.js project, select Node 24, and build with `pnpm build`. Do not deploy the SQLite demo to ephemeral serverless storage.
8. Run the SQL RLS assertions and integration smoke checks against the configured services before collecting real feedback.

Full configuration and operational details: [docs/backend.md](docs/backend.md).

## Boundaries and remaining work

The local demo is suitable for a presentation. Supabase, OpenAI and Vercel deployment are implemented as configuration paths but have **not been verified against live services** in this workspace. The migration/RLS script has not been executed without a database.

Attachments are deferred. No email notifications, retention scheduler, automatic retry queue, deletion UI, or MFA management UI is included. AI runs after receipt persistence; interrupted pending analysis can be retried manually. Public publication needs human review for indirect identification; pattern-based personal-data detection is conservative and incomplete. Raw descriptions are visible to authorized moderators. Before launch, the university must approve privacy wording, retention/access rules, and production operational procedures.

For an MVP the administrator fetches records and computes analytics client-side after authorization; larger datasets need paginated tables and SQL aggregate endpoints. Demo SQLite requires persistent local storage.

## Source map

- `src/app/`: public and protected routes; JSON API handlers.
- `src/components/public/`: landing and public user flows.
- `src/components/admin/`: dashboard, charts, review and management screens.
- `src/components/ui/`: reusable UI primitives.
- `src/lib/server/`: auth, validation, privacy, repositories and AI.
- `src/lib/analytics.ts`: stored-data analytics and filtering.
- `src/messages/`, `src/i18n/`: Russian and Kazakh messages.
- `supabase/`: schema and authorization assertions.
- `tests/`: unit/integration tests; `e2e/`: browser smoke tests.
