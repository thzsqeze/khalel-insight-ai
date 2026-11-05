# UniVoice AI

UniVoice AI is a Russian/Kazakh anonymous feedback and issue-resolution platform for universities. Each deployment has its own institution identity and Supabase database. The application starts with no reports, issues or fabricated statistics. There is no demo login or synthetic AI fallback.

## Run locally

Requirements: Node.js **22.13+** (Node 24 recommended), pnpm 11.

1. Create a Supabase project and apply `supabase/migrations/20261023112811_initial.sql` to its empty application schema.
2. Copy `.env.example` to `.env.local`. Set the Supabase URL, publishable key, server-only secret key, exact `APP_ORIGIN` and random `RATE_LIMIT_SALT`.
3. Create a trusted Supabase Auth identity, then grant its profile the `admin` role through an operator SQL connection. See [backend setup](docs/backend.md). No public administrator registration is provided.
4. Run:

```bash
pnpm install
pnpm dev
```

Open **http://localhost:3000**. In development, `localhost`, `127.0.0.1` and `[::1]` may be used interchangeably when `APP_ORIGIN` is a loopback URL with the same protocol and port; the browser's Origin must still match the actual Host. Production continues to require the exact configured origin. Public pages render without credentials; persistence and login require a configured Supabase project and return an error when unavailable. A failed database connection is never replaced with fictional records or a success receipt.

## Implemented

- Responsive public pages, category chooser, multi-step feedback, receipt/copy/download, private tracking, real email/password login and public progress.
- Server-protected dashboard, report review, issue grouping/separation, ownership, status, priority, internal resolution notes and history.
- Analytics calculated from stored records, plus empty states for a new database.
- Russian/Kazakh localization with next-intl and persistent language choice; bundled Inter, Tailwind, Lucide, Motion and Recharts.
- Supabase Auth with verified server-side roles, session refresh, PostgreSQL RLS, audit history, atomic mutations and pgvector similarity.
- Zod validation, honeypot, body limits, durable rate limits, same-origin checks, hashed 192-bit tracking tokens and server-only secrets.
- Separate optional AI consent, Groq/Cloudflare classification, local redaction, output validation and administrator retry. OpenAI with embeddings remains an explicit optional choice. An explicitly configured Cloudflare reserve handles Groq quota errors. Provider failures retain the report without inventing analysis.
- Optional Russian/Kazakh draft assistant in the feedback form: previews a clearer draft, suggests a category and asks fixed clarification questions. Applying text/category is explicit, and replacing the draft can be undone. Its separate consent does not enable post-submission AI analysis.
- Russian/Kazakh cookie settings, necessary-only or optional error diagnostics, 180-day preference, cross-tab updates and consent withdrawal without changing login or language cookies.
- Sentry browser, React and server/API error reporting with request-specific consent and a strict payload allowlist. Session replay, behavior analytics, tracing, logs and metrics are disabled.

Students and teachers submit without accounts. The public ticket reference shows only status; the private receipt code opens staff replies and visitor follow-ups. Public progress includes only human-reviewed summaries of groups with at least three reports, never raw complaint text.

## Configure a university

Optional `.env.local` or deployment variables:

```dotenv
ORGANIZATION_NAME=Example University
ORGANIZATION_NAME_RU=Название университета
ORGANIZATION_NAME_KK=Университет атауы
ORGANIZATION_INITIALS=EU
```

The active language selects its matching name, falling back to `ORGANIZATION_NAME`, then the neutral “Университетское сообщество” / “Университет қауымдастығы”. Restart the server after changing environment settings.

This MVP supports **one university per deployment and database**. Use separate Supabase projects for separate institutions. Shared-database tenant isolation and institution switching are not implemented. The existing GitHub repository URL is retained; the product name is UniVoice AI and the package identifier remains `univoice`.

Design references and decisions: [docs/univoice-design.md](docs/univoice-design.md). Connected design tools and the next focused pass: [docs/design-tools.md](docs/design-tools.md).

## AI analysis

The draft assistant uses the configured provider below through the server-only `POST /api/feedback/assist` route. It saves no draft or submission, sends only locally redacted text, and validates generated output. Durable abuse counters allow 5 requests per client per hour and 100 provider attempts per installation per 24-hour window; a reserve attempt counts separately. Errors leave manual submission available. A university knowledge chatbot is a planned next stage, not part of this feature.

Select one provider in `.env.local` or the hosting environment. Keys stay on the server:

| Provider | Configuration | Default model |
| --- | --- | --- |
| Groq (default) | `AI_PROVIDER=groq`, `GROQ_API_KEY` | `openai/gpt-oss-120b` |
| Cloudflare Workers AI | `AI_PROVIDER=cloudflare`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | `@cf/qwen/qwen3-30b-a3b-fp8` |
| OpenAI (optional paid API) | `AI_PROVIDER=openai`, `OPENAI_API_KEY` | `gpt-4.1-mini` |
| Disabled | `AI_PROVIDER=disabled` | No external requests |

Create a [Groq key](https://console.groq.com/keys) on its Free plan, or use the [Workers AI free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/). Free quotas are limited and may change; a paid provider account can incur charges under its own plan. UniVoice AI does not upgrade plans. Set `AI_FALLBACK_PROVIDER=cloudflare` with both Cloudflare credentials to allow one reserve attempt after Groq HTTP 429. Privacy, authentication, network and malformed-response failures never switch providers. Leave the variable empty to disable the reserve. After changing configuration, restart the server or redeploy.

With separate report consent, AI suggests a category, a summary and keywords in the report's language (Russian or Kazakh), urgency, and a confidence estimate. An administrator reviews every suggestion. Missing credentials, exhausted quotas, unsafe text or invalid responses leave the report available for manual review and retry. Groq/Cloudflare do not request embeddings; semantic similarity for newly analyzed reports requires explicitly selecting the existing OpenAI integration. Details: [provider setup and privacy](docs/backend.md#ai-providers).

## Cookies and Sentry

`univoice_cookie_consent` stores `v1.required` or `v1.diagnostics` for 180 days (`Path=/`, `SameSite=Lax`, `Secure` on HTTPS). Until a valid diagnostics choice exists, browser diagnostics remain off. Preferences can be reopened from the public footer, privacy page or administrator sidebar. Language and authentication cookies remain available with either choice. AI consent on the feedback form is independent.

Set `NEXT_PUBLIC_SENTRY_DSN` for browser diagnostics and `SENTRY_DSN` for the server (the latter falls back to the public DSN). A DSN is an ingestion address, not an administrative credential. Restart development or rebuild production after changing the public DSN. On each server request, the raw Cookie header must contain exactly one valid diagnostics choice. Missing, malformed, ambiguous or withdrawn choices prevent reporting. Errors are never saved for later delivery after consent.

Only exception type, a fixed generic message, sanitized source file locations, validated source-map IDs and an internal source tag are retained. Error text, report contents, identities, cookies, headers, request bodies, URL parameters, breadcrumbs and arbitrary context are removed. Sentry SDK v11 data collection is explicitly disabled by category. Every event uses the fixed unspecified IP `0.0.0.0` to prevent Sentry from inferring a visitor IP from the connection. For each new Sentry project, also enable **Prevent Storing of IP Addresses** and add the advanced scrubbing rule `[Remove] [Anything] from [$user.geo.**]`; these settings are enabled on the configured UniVoice project. The browser checks consent again immediately before dispatch; withdrawal prevents future events but cannot recall a request already sent.

For optional private source-map upload during builds, set `SENTRY_ORG`, `SENTRY_PROJECT` and a build-only `SENTRY_AUTH_TOKEN`. Without the token, errors still arrive but production stacks may remain minified. The token must never use a `NEXT_PUBLIC_` prefix or be committed. SDK build telemetry and automatic instrumentation are disabled. No test-error page is exposed by the application.

The `univoice` project in Sentry organization `apple-94` is configured locally and on Vercel. Connection and privacy verification events were received on 23 October 2026; alert creation was left off. The first connection test exposed Sentry’s automatic IP inference, which was then disabled and checked with a fresh event. Existing events are not retroactively scrubbed by these settings. A source-map upload token is not configured. Hosting environment variables are configured separately; ignored local values are not pushed to GitHub.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

GitHub Actions runs the same gates on every pull request and on pushes to `main` (`.github/workflows/ci.yml`): `checks` (typecheck, lint, `format:check`, Vitest), `build` and `e2e`, in parallel. The workflow sets only placeholder Supabase values and `AI_PROVIDER=disabled`, so no job reaches a real database or AI provider; private routes answer 401 under that configuration. Checks that need real credentials stay manual and skip themselves in CI: the live administrator and ticket workspace specs, the Sentry diagnostics spec and the SQL RLS assertions. `pnpm typecheck` runs `next typegen` first because `next-env.d.ts` references generated route types that are absent on a clean checkout. Enable the three jobs as required status checks in the repository settings to block merges on failure.

Vitest covers validation, privacy, analytics, authorization, real-repository failure/empty behavior, session refresh and rejection of the removed demo bypass. A blank SQLite adapter exists only under `tests/fixtures` for isolated repository contract tests; it is never imported by the application.

Playwright starts the regular application on port 3100, or uses `PW_BASE_URL` when supplied. Browser smoke tests exercise localization, login protection, topic preselection, explicit consents and mobile navigation without creating records. The SQL RLS assertions in `supabase/tests/rls.sql` require a migrated Supabase test database; their transactional fixtures are rolled back. The optional live administrator test uses `UNIVOICE_LIVE_ADMIN_FILE` pointing to a private JSON file with `email`, `password` and `projectUrl`; it disables authentication traces. Use `PW_BASE_URL=http://127.0.0.1:3000` when the local app is already running.

The production build uses the supported Webpack compiler because some desktop sandboxes restrict Turbopack build workers. Development uses Turbopack.

## Deployment

Public URL: **https://khalel-insight-ai.vercel.app/**. The existing Vercel project is `kai-6ade/khalel-insight-ai`, connected to the `main` branch of `thzsqeze/khalel-insight-ai`. The repository and hosting identifiers retain their original names; the product is UniVoice AI.

Set the variables from `.env.example` in your hosting environment. Use the exact HTTPS `APP_ORIGIN`, keep `SUPABASE_SECRET_KEY` server-only and configure `TRUSTED_IP_HEADER` only when your ingress overwrites it. Legacy Supabase anon/service-role keys remain supported. AI is optional; set the selected provider's server variables separately on the host. Deploy on the Node runtime (Node 24 recommended) with `pnpm build`.

Production uses `APP_ORIGIN=https://khalel-insight-ai.vercel.app`, `TRUSTED_IP_HEADER=x-vercel-forwarded-for` and the prepared Supabase project `wgagyfqxsmsjtajdtmpb`, as selected by the owner. Set all three dedicated server variables: `UNIVOICE_SUPABASE_URL`, `UNIVOICE_SUPABASE_PUBLISHABLE_KEY` and `UNIVOICE_SUPABASE_SECRET_KEY`. These take priority over provider-managed aliases and are never mixed with legacy credentials. URL and publishable keys are Vercel Config variables; service keys and the rate-limit salt are Secrets. The legacy `NEXT_PUBLIC_SUPABASE_*` configuration remains supported when none of the dedicated variables is set; Next.js includes those public values during the build, so rebuild after changing them.

Full setup, roles, privacy boundaries and operations: [docs/backend.md](docs/backend.md).

## Current integration status and limitations

The hosted **UniVoice** project (`wgagyfqxsmsjtajdtmpb`, Frankfurt / `eu-central-1`) is provisioned. Both migrations are applied and their local version numbers match the remote history. The first administrator is created; local credentials and keys are stored only in ignored files. Supabase RLS assertions, real login, feedback persistence, private tracking, issue creation and status changes were verified on 23 October 2026. The temporary verification report and its issue/history were removed. No sample data was migrated from the former local demo. Public hosting is on Vercel.

On 27 October 2026, the local Groq integration completed real API calls for synthetic Russian and Kazakh reports through the application's analysis function, including output privacy validation. These checks did not create database records. Cloudflare was subsequently verified with real synthetic RU/KK requests, and quota-only fallback is covered by HTTP contract tests. OpenAI remains unconfigured. The new AI configuration has not been deployed to Vercel by this change.

A subsequent full browser check on the same date reproduced and fixed the local `localhost` / `127.0.0.1` origin mismatch. A temporary consented report was submitted from the public form (201), tracked (200), analyzed by Groq, saved to Supabase, and viewed after real administrator login with its rendered summary matching the saved analysis. The test report was then deleted. Input preparation was subsequently improved to remove uncertain capitalized words while retaining useful feedback, instead of rejecting a whole ordinary sentence. Explicit identifying context and insufficient remaining text still block analysis; generated output and public titles retain stricter checks.

Attachments, email notifications, a retention scheduler, automatic retry queue, deletion UI and MFA management UI are not included. Interrupted AI processing can be retried manually. Pattern-based personal-data detection is conservative and incomplete; public summaries need human review. Authorized moderators can read raw reports. The institution must set its privacy, retention and access rules before collecting feedback.

The administrator snapshot fetches stored records with paging and computes analytics client-side; large datasets need SQL aggregates and paginated tables.

## Source map

- `src/app/`: public/protected routes and JSON API handlers.
- `src/components/public/`, `src/components/admin/`, `src/components/ui/`: interface components.
- `src/lib/server/`: Supabase repositories, auth, validation, privacy and AI.
- `src/proxy.ts`: administrator session cookie refresh.
- `src/lib/analytics.ts`: analytics and filtering.
- `src/messages/`, `src/i18n/`: Russian and Kazakh messages.
- `supabase/`: schema and RLS assertions.
- `tests/`, `e2e/`: automated checks.

The consented report `UV-EDBAC236B5` was retried successfully through the real staff UI on 27 October 2026 and retained in Supabase. Administrator retries now return actionable error codes instead of success when analysis fails. Groq remains primary, with an explicitly enabled Cloudflare reserve only after quota errors. Provider keys must be configured separately for each deployment and are never committed.

### Ticket workspace

The local cabinet now includes a ticket queue at `/admin/issues`, a conversation drawer at `/admin/issues?ticket=<id>`, a reference-based analytics screen at `/admin/analytics`, and owner-only team/departments management at `/admin/team`. Legacy `/admin/tickets/[id]` links redirect to the drawer. Opening a ticket keeps the queue and its filters in place. Replies reach anonymous authors on `/track` through their private receipt code; lookup by `UV-…` returns status only, and internal notes remain private. A visitor follow-up reopens a resolved ticket. Existing public issue groups remain available through the separate groups view.

Apply the additive migrations in `supabase/migrations` for a new installation. Ownership is a protected database flag on an admin profile; provision the first verified owner through a trusted operator connection, then use the team screen. Invitations never auto-grant roles. See [backend details](docs/backend.md) for permission rules, legacy deployment compatibility, email setup and verification limits.

Department email notices require Resend credentials and a verified sender (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_APP_ORIGIN`). Staff invitations/recovery use Supabase Auth email configuration. Neither is simulated as a successful send when configuration is absent. Configure the required server environment variables on Vercel before enabling AI fallback or email delivery in production.
