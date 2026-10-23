# UniVoice

UniVoice is a Russian/Kazakh anonymous feedback and issue-resolution platform for universities. Each deployment has its own institution identity and Supabase database. The application starts with no reports, issues or fabricated statistics. There is no demo login or synthetic AI fallback.

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

Open **http://localhost:3000** (or set `APP_ORIGIN=http://127.0.0.1:3000` when using that hostname). Public pages render without credentials; persistence and login require a configured Supabase project and return an error when unavailable. A failed database connection is never replaced with fictional records or a success receipt.

## Implemented

- Responsive public pages, category chooser, multi-step feedback, receipt/copy/download, private tracking, real email/password login and public progress.
- Server-protected dashboard, report review, issue grouping/separation, ownership, status, priority, internal resolution notes and history.
- Analytics calculated from stored records, plus empty states for a new database.
- Russian/Kazakh localization with next-intl and persistent language choice; bundled Inter, Tailwind, Lucide, Motion and Recharts.
- Supabase Auth with verified server-side roles, session refresh, PostgreSQL RLS, audit history, atomic mutations and pgvector similarity.
- Zod validation, honeypot, body limits, durable rate limits, same-origin checks, hashed 192-bit tracking tokens and server-only secrets.
- Separate optional AI consent, OpenAI classification/embeddings, local redaction, output validation and administrator retry. Provider failures retain the report without inventing analysis.
- Russian/Kazakh cookie settings, necessary-only or optional error diagnostics, 180-day preference, cross-tab updates and consent withdrawal without changing login or language cookies.
- Sentry browser, React and server/API error reporting with request-specific consent and a strict payload allowlist. Session replay, behavior analytics, tracing, logs and metrics are disabled.

Students and teachers submit without accounts. The private receipt code is needed to track status. Public progress includes only human-reviewed summaries of groups with at least three reports, never raw complaint text.

## Configure a university

Optional `.env.local` or deployment variables:

```dotenv
ORGANIZATION_NAME=Example University
ORGANIZATION_NAME_RU=Название университета
ORGANIZATION_NAME_KK=Университет атауы
ORGANIZATION_INITIALS=EU
```

The active language selects its matching name, falling back to `ORGANIZATION_NAME`, then the neutral “Университетское сообщество” / “Университет қауымдастығы”. Restart the server after changing environment settings.

This MVP supports **one university per deployment and database**. Use separate Supabase projects for separate institutions. Shared-database tenant isolation and institution switching are not implemented. The existing GitHub repository URL is retained; the product and package name are UniVoice.

Design references and decisions: [docs/univoice-design.md](docs/univoice-design.md).

## Cookies and Sentry

`univoice_cookie_consent` stores `v1.required` or `v1.diagnostics` for 180 days (`Path=/`, `SameSite=Lax`, `Secure` on HTTPS). Until a valid diagnostics choice exists, browser diagnostics remain off. Preferences can be reopened from the public footer, privacy page or administrator sidebar. Language and authentication cookies remain available with either choice. AI consent on the feedback form is independent.

Set `NEXT_PUBLIC_SENTRY_DSN` for browser diagnostics and `SENTRY_DSN` for the server (the latter falls back to the public DSN). A DSN is an ingestion address, not an administrative credential. Restart development or rebuild production after changing the public DSN. On each server request, the raw Cookie header must contain exactly one valid diagnostics choice. Missing, malformed, ambiguous or withdrawn choices prevent reporting. Errors are never saved for later delivery after consent.

Only exception type, a fixed generic message, sanitized source file locations, validated source-map IDs and an internal source tag are retained. Error text, report contents, identities, cookies, headers, request bodies, URL parameters, breadcrumbs and arbitrary context are removed. Sentry SDK v11 data collection is explicitly disabled by category. Every event uses the fixed unspecified IP `0.0.0.0` to prevent Sentry from inferring a visitor IP from the connection. For each new Sentry project, also enable **Prevent Storing of IP Addresses** and add the advanced scrubbing rule `[Remove] [Anything] from [$user.geo.**]`; these settings are enabled on the configured UniVoice project. The browser checks consent again immediately before dispatch; withdrawal prevents future events but cannot recall a request already sent.

For optional private source-map upload during builds, set `SENTRY_ORG`, `SENTRY_PROJECT` and a build-only `SENTRY_AUTH_TOKEN`. Without the token, errors still arrive but production stacks may remain minified. The token must never use a `NEXT_PUBLIC_` prefix or be committed. SDK build telemetry and automatic instrumentation are disabled. No test-error page is exposed by the application.

The `univoice` project in Sentry organization `apple-94` is configured locally. Connection and privacy verification events were received on 23 October 2026; alert creation was left off. The first connection test exposed Sentry’s automatic IP inference, which was then disabled and checked with a fresh event. Existing events are not retroactively scrubbed by these settings. A source-map upload token and public hosting deployment are not configured. Hosting needs the environment variables separately; ignored local values are not pushed to GitHub.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Vitest covers validation, privacy, analytics, authorization, real-repository failure/empty behavior, session refresh and rejection of the removed demo bypass. A blank SQLite adapter exists only under `tests/fixtures` for isolated repository contract tests; it is never imported by the application.

Playwright starts the regular application on port 3100, or uses `PW_BASE_URL` when supplied. Browser smoke tests exercise localization, login protection, topic preselection, explicit consents and mobile navigation without creating records. The SQL RLS assertions in `supabase/tests/rls.sql` require a migrated Supabase test database; their transactional fixtures are rolled back. The optional live administrator test uses `UNIVOICE_LIVE_ADMIN_FILE` pointing to a private JSON file with `email`, `password` and `projectUrl`; it disables authentication traces. Use `PW_BASE_URL=http://127.0.0.1:3000` when the local app is already running.

The production build uses the supported Webpack compiler because some desktop sandboxes restrict Turbopack build workers. Development uses Turbopack.

## Deployment

Set the variables from `.env.example` in your hosting environment. Use the exact HTTPS `APP_ORIGIN`, keep `SUPABASE_SECRET_KEY` server-only and configure `TRUSTED_IP_HEADER` only when your ingress overwrites it. Legacy Supabase anon/service-role keys remain supported. OpenAI is optional. Deploy on the Node runtime (Node 24 recommended) with `pnpm build`.

Full setup, roles, privacy boundaries and operations: [docs/backend.md](docs/backend.md).

## Current integration status and limitations

The hosted **UniVoice** project (`wgagyfqxsmsjtajdtmpb`, Frankfurt / `eu-central-1`) is provisioned. Both migrations are applied and their local version numbers match the remote history. The first administrator is created; local credentials and keys are stored only in ignored files. Supabase RLS assertions, real login, feedback persistence, private tracking, issue creation and status changes were verified on 23 October 2026. The temporary verification report and its issue/history were removed; the database has zero reports and zero issues. No sample data was migrated from the former local demo. OpenAI and a public hosting deployment remain unconfigured.

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
