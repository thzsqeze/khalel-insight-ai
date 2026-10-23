# Server and database operation

The application uses Supabase for all persisted data and Supabase Auth for administrator identities. It does not seed records, open a local database or accept the old demo cookie. SQLite is used only by isolated tests under `tests/fixtures`.

## Production setup

1. Create a Supabase project with PostgreSQL and pgvector support. Apply `supabase/migrations/20261023112811_initial.sql` through the Supabase CLI or SQL editor. The migration is one transaction and intended for an empty application schema.
2. Set `APP_ORIGIN` to the exact application origin (HTTPS in production), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY`. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are accepted as fallback. Do not expose a secret/service key in a `NEXT_PUBLIC_*` variable. Store local credentials in the ignored `.env.local`.
3. Create administrator identities through trusted Supabase administration. The auth trigger always creates a `viewer` profile, ignoring user metadata. Grant the chosen role with an operator SQL connection: `update public.profiles set role = 'admin' where id = '<verified-auth-user-uuid>';`. Disable public signups if the deployment does not need them. End users submitting reports never need an auth identity.
4. Configure a random `RATE_LIMIT_SALT` and `TRUSTED_IP_HEADER` only when the ingress overwrites that header. On Vercel, use `x-vercel-forwarded-for`. Without an explicitly trusted header, requests share a conservative global rate-limit bucket. Never pass a client-provided forwarding header through unchanged.
5. Optionally set `OPENAI_API_KEY`, `OPENAI_MODEL` and `OPENAI_EMBEDDING_MODEL`. The defaults are `gpt-4.1-mini` and `text-embedding-3-small`. Configure models supported by your account. Embedding dimensions must remain 1536 unless the migration and index are updated together.
6. Run the RLS checks on a disposable migrated Supabase database: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql`. The test creates temporary transactional fixtures and rolls them back. The PostgreSQL connection needs owner permissions to simulate `anon`, `authenticated`, and `service_role`.
7. Deploy using the Node runtime. Feedback is persisted before AI work is scheduled using Next.js `after()`. AI routes allow 60 seconds; the provider has a 20-second timeout with no automatic retries. Review pending/failed records from the administrator UI and explicitly retry if a background invocation was interrupted.

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

AI runs only with separate consent. Email, phone, long numeric identifiers, URLs, handles, and obvious multi-part names are redacted locally. An allow-list-based proper-name check suppresses the entire outgoing request when uncertain. This is intentionally conservative: valid Russian/Kazakh text can require manual review and remain failed. Regex processing is not a complete personal-data detector; a production institution should validate it against representative bilingual data and its retention policy. Generated summaries and keywords are checked again before saving. Provider failures do not discard reports. AI suggestions never change issue membership, status, or final priority. Classification and embeddings are optional; missing embeddings yield no production similarity matches and never trigger a synthetic fallback.

## Operational limits

No automatic retry worker, email delivery, attachment storage, MFA UI, export pipeline, report deletion UI, or scheduled retention purge is included. Plan retention periods and operator procedures before collecting real reports; audit records intentionally contain changed field names rather than duplicated raw text. Keep raw reports and embeddings in access-controlled storage. Remove obsolete rate-limit buckets periodically with an operator job (`delete from public.rate_limits where window_start < now() - interval '2 days'`). The administrator snapshot fetches all records with paging, suitable for an MVP; larger deployments should use SQL aggregate endpoints and cursor pagination. Supabase/live-provider integration must be checked with real deployment credentials before launch.

## Hosted verification notes

The schema migrations in this repository use the actual versions recorded by Supabase. Migration `optimize_staff_policies_and_actor_indexes` adds indexes for actor/reviewer foreign keys and evaluates authenticated role checks once per statement. The performance advisor now only reports indexes unused by this new, empty database.

Security advisor notices were reviewed against the access design and RLS assertions:

- `rate_limits` deliberately has RLS with no client policy: only service operations can access it. [RLS with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- `public_issues()` deliberately permits anonymous and authenticated execution of a security-definer function; it returns only reviewed public fields for groups of at least three reports. [Anonymous security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- `is_staff()` deliberately permits authenticated execution to support read policies; it returns a boolean for the current verified identity. [Authenticated security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

These functions have fixed search paths and restricted grants. Private tables, service-only mutation functions and public-field projections were exercised by `supabase/tests/rls.sql`; its fixtures are rolled back.
