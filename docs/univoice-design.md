# UniVoice identity and interface

The user selected **UniVoice** as the institution-independent product name. University identity is deployment configuration, not part of the product wordmark. RU and KK have equal coverage.

## References reviewed

- [Flankgan feedback dashboard — UIGO Studio, Dribbble](https://dribbble.com/shots/27385610-Flankgan-AI-Customer-Feedback-Aggregator-Dashboard): a restrained neutral interface, compact controls and a structured feedback table. Adopt the focus on work and readable rows, not its assets or exact layout.
- [Monolytics — Artem and Oleksandra Pravda, Behance](https://www.behance.net/gallery/198265921/Monolytics-User-Analytics-App-SaaS-UX-UI-Design): reviewed the case study's editorial composition, large typography and dark green/neutral presentation. Adapt the clear hierarchy to a university service; avoid decorative mockup effects in the application.
- [Feedback Management Dashboard — Antor Paul, Dribbble](https://dribbble.com/shots/23707231-Feedback-Management-Dashboard): additional feedback-management reference found during research.

No third-party images, logos or interface assets are included in the product.

## Design decisions

- Warm paper `#f6f5f1`, graphite `#242722`, forest green `#315747`, thin neutral rules `#dedfd7`.
- Bundled Inter supports Cyrillic and Kazakh; large public headings contrast with compact workspace typography.
- A custom U/voice wordmark replaces the university initial and AI suffix.
- Public landing: asymmetrical typography, a labeled example of a request and its progress, direct submission/tracking actions, numbered process explanation. Illustrative content must never imply real service metrics.
- Workspace: operational headings, a metric strip, review queue, restrained charts, readable tables. No promotional sidebar card.
- Preserve keyboard focus, language persistence, mobile navigation and the existing privacy/consent boundaries.

## Implementation and validation

1. Add neutral brand and localized institution configuration, preserving existing sessions and demo data.
2. Rebuild public layout and refine all public flows.
3. Rebuild workspace navigation, dashboard hierarchy and table/chart styling.
4. Verify locale parity, institution fallback, feedback/tracking/admin journeys, mobile overflow and production compilation.
5. Publish coherent separate commits to the existing GitHub repository.

One deployment serves one institution. Shared-database multi-tenancy is outside this change; changing a label does not create a tenant boundary.

Verified on 23 October 2026: ESLint and TypeScript pass, 38 Vitest tests pass, all five Chromium journeys pass (including RU/KK persistence, institution identity, mobile public routes, anonymous submission/status updates and queue navigation), and the production Webpack build succeeds. The new layouts were visually inspected in the browser and captured at 1440×1000. Live Supabase/OpenAI deployment remains outside the local verification.
