# Khalel Insight AI — implementation design

The supplied master brief is the product specification. Build the specified Next.js MVP in the empty repository; the user explicitly requests implementation without stopping at architecture. The current checkout is empty and suitable, so work in place.

Use light warm neutral surfaces, deep slate text, emerald/teal accents, structured tables and an original feedback-signal brand mark. Public screens prioritize a mobile anonymous submission flow. Administration uses a persistent desktop sidebar and responsive navigation. Russian is initial; Kazakh is available through a locale cookie and next-intl.

Server-only repositories separate local persistent SQLite demo data from Supabase production data. Demo mode is explicitly enabled, clearly marked, and may provide a server-issued demo administrator session. Production authentication verifies Supabase users and database-assigned roles. Every admin API verifies authorization independently of page layouts. Raw report data is never included in public progress responses. Tracking tokens contain 192 bits of randomness and are stored only as hashes.

AI receives redacted text only with separate consent. Structured output is validated, all suggestions remain reviewable, and unavailable AI does not lose a report. Similarity proposes membership; only an authenticated moderator adds/removes members. Publication requires reviewed summaries and at least three reports. Demo AI is explicitly synthetic.

Attachments are deferred. No email notifications, public registration, or automatic disciplinary decisions. Vercel production requires Supabase, an externally managed admin identity, server secrets, and optionally OpenAI. Demo SQLite is for a single local Node process / persistent host, not multi-instance serverless deployment.
