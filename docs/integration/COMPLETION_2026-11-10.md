# Integration audit, 2026-11-10

## Scope and preserved work

- One local worktree found: this repository. Checked all local and fetched origin branches.
- `cfc9c24` preserves the A2 trainer, shared Olympus rewards, audio and homepage proposals.
- `2fa33aa` checkpoints previously uncommitted legal, domain, social preview, promotion and prototype work.
- `b3616ef` integrates all four remaining roadmap/concept branches into main; none of their unique commits are left outside main.
- Reviewed recent related chats: cookie/legal, domain/SSL, social previews, A2 trainer, card UX, design, previous branch collection and roadmap. Preserved the explicit rejection of replacing practice tabs with a dropdown. Future roadmap ideas remain marked as plans, not falsely presented as completed features.
- Source prototypes are committed as reviewable prototypes, not activated as production navigation.
- Local `output/` exports and `tmp/` research remain in place, excluded from releases/Git to avoid publishing old archives, third-party scans and scratch work. Inventory and hashes are preserved in `local-artifacts-2026-11-10.json`.

## Implemented integration

- Legal/operator/storage config and source documents are versioned once. Deterministic RU/EN generation, hash integrity and mandatory version increment prevent silent replacement of accepted content.
- Public documents and banner are concise, with no internal implementation checklists. Required functions, contact, usage rights, retention and user controls remain stated.
- Atomic server validation and agreement records; existing users are not assigned fictional acceptance. Versioned document snapshots remain recoverable from the database.
- Password-confirmed export, deletion and logout everywhere; API ownership derives from the authenticated session. Deletion includes learning, metadata, roles, sessions, reset tokens and personal acceptance records.
- Server learning has CAS revisions, separate reset generations and server-side import fingerprints. Intentional reset closes old imports. Cross-tab invalidation clears identity even when a save fails after session revocation.
- Operator role assignment requires explicit server CLI against existing user ID/email. User-supplied registration role and matching OWNER_EMAIL cannot grant admin access.
- Canonical route registry supports clean account URLs and direct reload. Server, Vercel rewrites and deployment list are checked against their source registries.
- Hourly retention worker shares the exact application's database environment. Request-driven cleanup remains available for serverless. Expired security records and inactive guest data are removed; registered accounts are retained until deletion.

## Verification

25 Python tests and five JavaScript suites passed on the final integrated implementation. Browser suites passed for legal/account privacy and the full A2 flow: mobile layout, blocked storage, explicit acceptance, export, erase/reset, stale-tab write rejection, session revocation, shared scores, drafts, rewards and exam completion.

## Release boundaries

Latest legal revision is a reviewed implementation draft, not a guarantee of complete legal compliance. Known facts: operator is in Russia, Saint Petersburg; full postal address, actual datacenter location, SMTP provider/country and operational backup/log retention are unconfirmed. `build_legal.py --release --check` must fail until mandatory facts are filled in. Russian localization/notifications, processor agreements and applicability to actual markets require factual checks.

Email verification remains a tracked security issue before broad paid launch. Child accounts/verified parental consent, optional trackers, payments and future learning roadmap features are not implemented by this integration.

The PostgreSQL chat has separately migrated the live backend and reviewed admin/routing; its deployment status is recorded in `POSTGRES_STATUS.md`. Publishing the latest legal revision is separate from preserving all work in main.
