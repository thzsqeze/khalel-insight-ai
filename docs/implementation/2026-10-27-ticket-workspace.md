# UniVoice ticket workspace

User request: implement the supplied Cloudzy ticket-list and conversation UX references in UniVoice, add replies, routing to responsible staff/departments including department email, and a secure role for granting staff access.

Implementation decisions: keep the current Next.js/Supabase stack, RU/KK and UniVoice forest-green identity. A compact ticket table opens a dedicated conversation page with reply/private-note tabs, AI analysis, history, and a right-hand status/priority/department/assignee panel. Existing real submissions are preserved. No seeded tickets or invented departments. Grouped public issues remain available separately. Tickets have their own resolution workflow; public grouped-issue status is separate.

A visitor continues using the private tracking code as a bearer secret. Their tracking page shows only replies intended for them and allows a follow-up. Internal notes, assignments, staff identities and private audit details are never included in that response. Codes stay out of URLs/logs, are hashed in storage, and follow-ups are bounded, validated and rate limited.

Roles: owner manages team roles and departments; admin and moderator are trusted staff with access to the university's ticket queue. Viewer has no cabinet access. Role checks read the database on each request, never user metadata. Role changes use an atomic owner-only database action with auditing and last-owner/self-lockout protection. This remains one university per deployment/database; it does not claim cross-university tenant isolation.

Department email forwarding is an explicit staff action, with a server-selected department address and a short notice linking to the authenticated ticket page. Complaint text and tracking codes are excluded. Delivery is recorded; missing email configuration must be shown honestly. No actual email is sent during development verification. A real sender provider/domain is required for production delivery.

Work split: (1) ticket schema/repository/routes and security tests; (2) owner/team access and UI; (3) queue/conversation UX; (4) root integrates tracking replies, email delivery and verification. Apply additive schema changes only after review. Bootstrap the user's previously verified admin account as the initial owner separately from reusable migration. No blanket commits or production deployment.
