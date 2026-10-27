# Server and database operation

The application uses Supabase for all persisted data and Supabase Auth for administrator identities. It does not seed records, open a local database or accept the old demo cookie. SQLite is used only by isolated tests under `tests/fixtures`.

## Production setup

1. Create a Supabase project with PostgreSQL and pgvector support. Apply `supabase/migrations/20261023112811_initial.sql` through the Supabase CLI or SQL editor. The migration is one transaction and intended for an empty application schema.
2. Set `APP_ORIGIN` to the exact application origin (HTTPS in production), plus the dedicated server variables `UNIVOICE_SUPABASE_URL`, `UNIVOICE_SUPABASE_PUBLISHABLE_KEY`, and `UNIVOICE_SUPABASE_SECRET_KEY`. Set all three together; incomplete dedicated configuration fails instead of mixing projects. When none is set, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` remain supported, including legacy anon/service-role key fallbacks. Do not expose a secret/service key in a `NEXT_PUBLIC_*` variable. Store local credentials in the ignored `.env.local`.
3. Create administrator identities through trusted Supabase administration. The auth trigger always creates a `viewer` profile, ignoring user metadata. Grant the chosen role with an operator SQL connection: `update public.profiles set role = 'admin' where id = '<verified-auth-user-uuid>';`. Disable public signups if the deployment does not need them. End users submitting reports never need an auth identity.
4. Configure a random `RATE_LIMIT_SALT` and `TRUSTED_IP_HEADER` only when the ingress overwrites that header. On Vercel, use `x-vercel-forwarded-for`. Without an explicitly trusted header, requests share a conservative global rate-limit bucket. Never pass a client-provided forwarding header through unchanged.
5. Optionally configure one AI provider as described below. The default is Groq; it needs `GROQ_API_KEY`. OpenAI runs only with `AI_PROVIDER=openai`. Missing keys never cause a switch to another provider.
6. Run the RLS checks on a disposable migrated Supabase database: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql`. The test creates temporary transactional fixtures and rolls them back. The PostgreSQL connection needs owner permissions to simulate `anon`, `authenticated`, and `service_role`.
7. Deploy using the Node runtime. Feedback is persisted before AI work is scheduled using Next.js `after()`. AI routes allow 60 seconds; the provider has a 20-second timeout with no automatic retries. Review pending/failed records from the administrator UI and explicitly retry if a background invocation was interrupted.

## AI providers

`AI_PROVIDER` selects `groq` (default), `cloudflare`, `openai`, or `disabled`. Selection is server-side and does not depend on which other keys happen to be present. An unknown value or incomplete configuration fails without making a request. Disabled analysis is skipped. `AI_FALLBACK_PROVIDER=cloudflare` explicitly enables one reserve attempt after Groq HTTP 429, with complete Cloudflare credentials. Both receive the same locally redacted text; the stored source identifies the successful provider. Missing consent, privacy, configuration, authentication, network and invalid-response failures do not switch providers. At most two 20-second calls are made; there is no automatic paid fallback.

For Groq, create a key at <https://console.groq.com/keys> and set `GROQ_API_KEY`. `GROQ_MODEL` defaults to `openai/gpt-oss-120b`; `openai/gpt-oss-20b` is another model with strict structured output support. Requests go directly to Groq's OpenAI-compatible chat endpoint; the model name does not mean a request is sent to OpenAI. Use the Free plan if no spending is intended. As checked on 27 October 2026, both models have Free plan limits of 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day; verify the account's current [limits](https://console.groq.com/docs/rate-limits). [Structured output requirements](https://console.groq.com/docs/structured-outputs) are enforced alongside local validation. Check Groq's [data controls](https://console.groq.com/docs/your-data) for the university's retention requirements; reliability/abuse retention exceptions and opt-out settings apply.

For Cloudflare, select `AI_PROVIDER=cloudflare` and set the 32-character hexadecimal `CLOUDFLARE_ACCOUNT_ID` and an account-scoped `CLOUDFLARE_API_TOKEN` with Workers AI access. `CLOUDFLARE_AI_MODEL` defaults to `@cf/qwen/qwen3-30b-a3b-fp8`. The adapter uses the account's direct OpenAI-compatible endpoint, without AI Gateway caching or logging. The [Workers Free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/) is currently 10,000 neurons/day and stops accepting requests after that allocation; a paid account has different billing. See [data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/) and [model documentation](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/).

Both options classify consented, locally redacted text into category, summary, keywords, urgency and confidence. The prompt requests Russian or Kazakh according to the report language; language quality still requires checking with representative synthetic examples before launch. Every result needs human review. Refusals, truncated output, malformed JSON, invalid fields, unsafe summaries, network errors and quota exhaustion produce a failed analysis while preserving the report. Administrators can retry it after correcting the configuration or after quota reset. Provider credentials and error payloads must not be logged.

Free-provider analysis does not call embedding APIs. Existing vectors are retained; new free-provider analyses do not get synthetic vectors or automatic semantic matches. To use the existing paid OpenAI path, explicitly set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, optionally `OPENAI_MODEL` (default `gpt-4.1-mini`) and `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`). Embedding dimensions must remain 1536 unless the migration and index are updated together. Changing embedding models requires a coordinated reindex; do not mix vector spaces. An embedding failure does not discard a valid classification.

Local `.env.local` settings are not deployment settings. Restart local development after changing keys, and configure the same selected provider separately in Vercel before redeploying. Keep all keys out of `NEXT_PUBLIC_*` variables and Git. No live provider integration is confirmed merely by passing mocked HTTP contract tests.

Verification on 27 October 2026: real Groq calls through `analyzeSubmission` completed for synthetic RU and KK reports, with valid structured results, local output privacy checks and mandatory human-review flags. No database records were created. Live checks caught ordinary capitalized summary wording being rejected by the conservative proper-name filter. The prompt now uses neutral localized headings and impersonal descriptions; only the common Kazakh word `Кері` was added to the existing allow-list. Tests still reject names and identifying context after those headings. Cloudflare subsequently passed real synthetic RU/KK requests. A live Kazakh response exposed a truncated JSON result; the prompt now explicitly keeps category and urgency enum values in English while summary and keywords use the report language. Quota-only reserve behavior is covered by HTTP contract tests. Groq credentials are local; the deployed site still needs the selected provider's variables and a new deployment.

## First administrator

Create the trusted operator in Supabase Authentication using an email/password identity. Set the password in a trusted password flow, never in a committed file. New profiles always begin as `viewer`. After verifying the exact Auth UUID, run:

```sql
update public.profiles
set role = 'admin'
where id = '<verified-auth-user-uuid>';
```

Then sign in at `/login` and confirm `/api/admin/overview` returns the empty database. A profile role cannot be granted through signup metadata or from the browser. Provision additional moderators explicitly with the `moderator` role. There are no default credentials, seed accounts or fake metrics.

The hosted UniVoice project `wgagyfqxsmsjtajdtmpb` is active in `eu-central-1`. Its two migrations are applied and the first administrator exists. The integration was checked with transactional RLS assertions and a real application login → submission → tracking → issue → status-change journey. Temporary records were removed. Local server credentials are in ignored `.env.local`; initial administrator access is in ignored `.data/admin-access.json` with owner-only file permissions. Neither file belongs in Git. Public hosting is `https://khalel-insight-ai.vercel.app` in Vercel team `kai-6ade`; the owner selected this prepared database for the hosted site. OpenAI remains unconfigured.

The hosting runtime logs missing configuration names and failed database error codes with the Supabase hostname. Database messages, details, hints, report text and credentials are excluded. These operational logs are separate from optional consent-gated Sentry events. When diagnosing an environment change, compare the running deployment's hostname with the intended database, and check both build-time and runtime configuration. Do not log environment values or provider error objects.

## Security and privacy boundaries

The Next.js proxy refreshes Supabase session cookies on administrator routes and sets private/no-store cache headers. Every administrator API independently calls `requireAdmin()`. Authentication uses Supabase `auth.getUser()` and queries `profiles.role` server-side, never token metadata or a client role field. The SQL migration enables RLS on every private table, denies anonymous direct table access, denies ordinary authenticated users private data, and removes all profile mutation privileges. Administrative mutations use service-only atomic RPCs with a validated administrator actor and audit records.

All state-changing endpoints check the exact browser origin. JSON bodies are streamed with a 16 KiB limit; role/category/length constraints, consent, an empty honeypot, and a two-second minimum fill time are enforced server-side. Feedback allows five attempts per hour, tracking thirty per ten minutes, login ten per fifteen minutes, and administrator AI retries thirty per hour. Rate limits use an atomic PostgreSQL upsert and never fall back to process memory or a local demo.

Tracking codes contain 192 random bits. Only their SHA-256 hashes are stored. The receipt is the only place the code is returned; losing it cannot be recovered from the database. Tracking outputs reference, category, status, dates, and status/date events only. Codes are submitted in a JSON POST body, never a URL.

Public issues require an explicit moderator-authored public summary and at least three current member reports. Public queries project an allow-list and never include complaint text, faculty, identities, ownership, analysis, resolution notes, or audit metadata. Editing the title without re-reviewing a summary unpublishes the issue. The summary and title must be checked by a human for indirect identification before publication; a minimum count is a privacy safeguard, not a formal anonymity guarantee.

AI runs only with separate consent. Email, phone, long numeric identifiers, URLs, handles, and obvious multi-part names are redacted locally. Input preparation removes uncertain capitalized words while retaining useful surrounding text. Explicit identifying context and input reduced to placeholders or insufficient useful words still block the outgoing request. Generated output and public titles retain the stricter checker. This is intentionally conservative: valid Russian/Kazakh text can require manual review and remain failed. Regex processing is not a complete personal-data detector; a production institution should validate it against representative bilingual data and its retention policy. Generated summaries and keywords are checked again before saving. Provider failures do not discard reports. AI suggestions never change issue membership, status, or final priority. Classification and embeddings are optional; missing embeddings yield no production similarity matches and never trigger a synthetic fallback.

## Operational limits

No automatic retry worker, email delivery, attachment storage, MFA UI, export pipeline, report deletion UI, or scheduled retention purge is included. Plan retention periods and operator procedures before collecting real reports; audit records intentionally contain changed field names rather than duplicated raw text. Keep raw reports and embeddings in access-controlled storage. Remove obsolete rate-limit buckets periodically with an operator job (`delete from public.rate_limits where window_start < now() - interval '2 days'`). The administrator snapshot fetches all records with paging, suitable for an MVP; larger deployments should use SQL aggregate endpoints and cursor pagination. Supabase/live-provider integration must be checked with real deployment credentials before launch.

## Hosted verification notes

The schema migrations in this repository use the actual versions recorded by Supabase. Migration `optimize_staff_policies_and_actor_indexes` adds indexes for actor/reviewer foreign keys and evaluates authenticated role checks once per statement. The performance advisor now only reports indexes unused by this new, empty database.

Security advisor notices were reviewed against the access design and RLS assertions:

- `rate_limits` deliberately has RLS with no client policy: only service operations can access it. [RLS with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- `public_issues()` deliberately permits anonymous and authenticated execution of a security-definer function; it returns only reviewed public fields for groups of at least three reports. [Anonymous security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- `is_staff()` deliberately permits authenticated execution to support read policies; it returns a boolean for the current verified identity. [Authenticated security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

These functions have fixed search paths and restricted grants. Private tables, service-only mutation functions and public-field projections were exercised by `supabase/tests/rls.sql`; its fixtures are rolled back.

## Analysis retry results

Administrator retry reports success only after completed analysis is saved. Privacy, configuration, quota, provider and invalid-response failures return safe codes and localized guidance; raw provider errors are never exposed. Failed retries cannot show a successful-save confirmation. The consented report `UV-EDBAC236B5` was retried through the real staff UI and retained on 27 October 2026.

## Ticket workspace and staff access (27 October 2026)

The new cabinet treats each submission as a ticket, with independent status, priority, a department and a staff assignee. Grouped public issues retain their own status. Existing submissions are backfilled without replacing their AI analysis or tracking hashes. New submissions get a ticket in the same transaction.

`/api/admin/tickets` and individual ticket mutations require a verified staff session. Ticket RPCs are service-only, recheck and lock the actor's current profile, and validate assignees/departments. Direct `anon`/`authenticated` table access is revoked with RLS enabled. `reply` is visible to the visitor; `note` is internal. Visitor follow-ups require the high-entropy tracking code in a same-origin, rate-limited POST. The database stores only its hash. `track_ticket_submission` intentionally returns no staff identifiers, assignments, department emails or internal notes. A follow-up reopens a resolved ticket to `under_review`.

`POST /api/track` also accepts a complete public reference (`UV-` plus ten hexadecimal characters, case-insensitive). That branch performs an exact server-only lookup and returns only `{ access: "status", reference, status }`. It exposes no message, category, date, event, UUID or identity. Personal-code lookup continues through the hashed-code RPC and returns `access: "conversation"`. Both branches share origin and rate-limit checks; public references never authorize `/api/track/messages`. No additional database grants or migrations are required.

The owner role is stored as protected `profiles.is_owner=true` plus legacy `role='admin'`. The application derives the owner label from these database fields, never from user metadata. This preserves access in the already deployed version. Only an owner can invite identities, send password-recovery links, change roles and manage departments. New invitations remain viewers until the email is confirmed and an owner explicitly grants access. `change_role` is bound to `auth.uid()`, uses a transaction lock and fresh profile checks, rejects self-role changes and last-owner removal, and records old/new roles in an owner-only audit table. Role revocation takes effect on subsequent authorized requests, without waiting for JWT metadata refresh.

The verified existing administrator was bootstrapped as the first owner separately from migrations. Reusable migrations contain no personal email or generated user ID. One deployment/database still belongs to one institution. Staff are trusted operators of the whole institution queue; assignment is a responsibility field, not a separate access boundary.

Legacy `track_submission` is retained unchanged for the deployed grouped-issue workflow. The new application uses `track_ticket_submission`. Do not remove this compatibility RPC while older deployments still use it. Migration filenames match the versions recorded by the remote migration runner.

### Department notifications

Email forwarding is an explicit staff action. Configure `RESEND_API_KEY`, `EMAIL_FROM` (a bare verified sender email) and `EMAIL_APP_ORIGIN` (the public HTTPS origin, without a path). `APP_ORIGIN` is the fallback for the notification link. The destination is selected from the assigned active department on the server, never accepted from the browser. A message contains only the ticket reference, authenticated cabinet link and instructions; no complaint content or tracking secret.

A service-only reservation serializes each request UUID. The same UUID never sends twice, and Resend also receives an idempotency key. A successful result means accepted by the provider, not confirmed mailbox delivery. Explicit provider rejection is recorded as failed. Ambiguous network/5xx outcomes remain pending and require provider inspection before retry; no automatic resend can duplicate a potentially accepted message. No real department email or employee invitation was sent during verification.

Invitations/recovery use Supabase Auth's mail configuration separately from Resend ticket notices. Add the exact `/auth/setup-password` URL to Supabase's allowed redirects for each intended origin and configure production SMTP before inviting arbitrary staff. The default implicit invite/recovery fragment is consumed only in the setup page, removed from the URL, and submitted same-origin; the verified user sets their own password, is signed out, and must log in normally. Setting a password never grants access.

### Verification and limits

Application tests cover API role gates, invalid input, email reservation outcomes, role assignment and recovery. SQL suites `tickets.sql`, `team-roles.sql` and `tracking-compatibility.sql` were executed against a fresh local PostgreSQL database. A real local-app/Supabase flow verified staff reply, private-note exclusion, assignment, resolution, wrong-token denial and visitor reopening; its temporary ticket and department were removed. The original `UV-EDBAC236B5` remains intact with completed Groq analysis.

Supabase advisors reported intentional service-only tables without RLS policies and explicitly guarded SECURITY DEFINER entry points. Supabase leaked-password protection is currently disabled in the existing project; no claim is made that this provider-level feature is enabled. New password setup enforces a minimum of 12 characters. End-to-end mailbox delivery and external employee invitation await actual mail configuration and were not tested by sending messages.
