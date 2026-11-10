# PostgreSQL / owner / routing integration status

## Ownership and integration

I acknowledge the shared workspace and your ownership of final combined commit/push main. Do not commit yet: clean URL routing and final verification are in progress. This file will be marked READY when complete. No new worktree is needed: `git worktree list` lists this main only and all local branches are ancestors of main.

## Live server facts

- DigitalOcean VPS 161.35.40.15, Ubuntu; actual datacenter country has not been independently verified. Do not infer country from account/operator.
- Installed PostgreSQL and enabled service. App connects over Unix socket with peer authentication as OS/database role greek-verbs, database greek_verbs. No DB password created or transmitted.
- `/etc/systemd/system/greek-verbs.service.d/postgres.conf` sets DATABASE_URL; owner.conf sets OWNER_EMAIL=annaproeng@gmail.com. No secrets in these values.
- Migrated 2 accounts and 2 active sessions from /var/lib/greek-verbs/auth.sqlite3. Source SQLite remains, `.before-postgres` backup created. Migration source contains no preexisting server learning records. Browser learning is imported on visits only; never claim all browser data has already been collected.
- Actual role counts checked: 1 owner, 1 user. Owner-only admin_users action and topbar gear dialog implemented in auth.js. Anonymous access returns 403. Registration payload cannot assign role.
- Live nginx max request size increased from 8k to 2m in both sites. setup-server.sh updated accordingly.
- SMTP configuration has not been changed or read. Do not claim working password email delivery.
- Retention: guest cookie is one year in api/learning.py. No guest server-record cleanup implemented here; legal retention/maintenance must match your chosen implementation.
- PostgreSQL + legal + storage code was deployed earlier, including your learning_metadata improvements. Latest clean route changes are NOT deployed yet.

## Routing work in progress

routes.json is the authoritative public route registry. server.py serves its mapped index.html for direct GET/HEAD; auth.js fetches it on initialization and uses pushState/popstate. Legacy hash account links normalize to clean URLs, password reset email uses /reset?reset_token=. routes.json added to public-files manifest. Vercel rewrite generation/check to be completed. No further full deploy until shared checks are complete.

## Existing verification

16 auth integration tests and learning unit test previously passed; JS concurrent counter test passed. New routing and your storage-generation changes need fresh full verification. Shared build tools are available at /Users/annavinogradova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.

Owner security correction implemented: removed runtime OWNER_EMAIL promotion and registration auto-promotion. New accounts always receive user; existing DB roles remain. Explicit scripts/manage_owner.py requires both existing user_id and email and is operator-only, never public HTTP. Updated integration test now explicitly provisions a test owner and asserts that even OWNER_EMAIL registration plus role=owner payload yields user. Live established owner's role will remain unchanged after deployment.

## Routing verification (local complete)

- 22 Python tests pass, including direct GET/HEAD for every route, owner-only API, server learning export and ownership.
- All 5 JS test suites pass.
- Browser tested /profile redirecting anonymous visitor to /login, signup tab pushing /register, login opening /profile, owner gear dialog listing roles, /profile reload retaining session and route.
- Fixed all remaining href="#" account back links; privacy storage details now uses ?section=storage.
- build_routes.py --check validates Vercel rewrites against routes.json; deploy now checks it. No actual nginx rewrite is needed: app serves path through Python.
- Admin proof screenshot at output/admin-routing-review.png uses a test-only local account.
- READY for final joint integration checks and main commit/push. No branch commits unique outside main. I will avoid committing your files. I plan only scoped deployment of routing/admin/storage runtime assets, preserving your live legal documents until your publication checks are resolved.

## Live deployment and final facts

Scoped routing/runtime deployment completed; backup is /var/backups/greek-verbs/before-clean-routes-20261110.tar. Your legal revision .2 was NOT uploaded. New api/learning.py required CONFIG.retention.guestDays, absent in old live config; initial smoke test caught guest load503. Corrected live OLD-version config additively with guestDays=365 (matches existing deployed cookie lifetime), preserving old version/manifest/docs. No local runtime edits made during your tests. Rechecking live API now.

DigitalOcean instance metadata directly reports region `lon1` (London region). This is evidence from the host, not IP geolocation. SMTP_HOST / SMTP_FROM / SMTP_USER / SMTP_PASSWORD are all NOT configured in the running systemd process. No SMTP values/secrets were printed or copied. Actual service remains on PostgreSQL peer socket; owner role persisted.

FINAL LIVE RESULT: PostgreSQL persistence/save/reload/reset/stale-generation rejection all PASS. All six clean URL requests return200 on production. Runtime files are frozen for your final tests and integration; I will not deploy further assets or overwrite your banner/profile wording. Main commit/push remains yours as agreed. Owner assignment is preserved in live DB and new registrations always user. One request-time config compatibility issue was caught and corrected before this result (see above).

Browser production check: /profile now correctly redirects anonymous visitors to /login with clean address, and header/forms render. The still-old LIVE legal.js has a remaining privacy.en.html#storage link because it was excluded from scoped deployment. Local legal.js already uses ?section=storage. Please include current tested legal.js in final runtime publish (with existing live legal manifest/doc revision) to satisfy user's request to remove hashes everywhere. It reads the live manifest dynamically and need not force publishing your new legal docs.
