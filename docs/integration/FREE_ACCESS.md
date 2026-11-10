# Free practice access

Implemented following the user's 10-task daily correction.

- Hermes onboarding appears on a first learning-page visit. Language/welcome and the contextual tour can be skipped. Completing or skipping offers registration; visitors may continue as guests.
- Guests have three task openings per format, once per guest cookie: cards, translation quiz, matching pairs, tense identification, conjugation, tense change, situations, missing letters, and phrases.
- Accounts receive a separate, one-time three-task bonus in each format. Existing accounts also receive this bonus on their first use of the feature. Guest use does not deduct from it.
- Accounts additionally have one shared allowance of 10 tasks per calendar day, reset at midnight Europe/Nicosia. A format's bonus is spent before the shared daily pool. Unspent bonus persists; daily tasks do not accumulate. No per-format daily cap applies after the bonus: the shared pool can be spent in any format.
- One card reveal, one phrase reveal with audio, one selected matching pair, one question response, or one situation submission costs one task. Current-question retries and repeated card/phrase audio do not incur an additional debit. Separate newly generated questions count separately.
- All verb lists and conjugation tables remain open. Full A2 exam practice continues to require Plus/Pro. Expiring admin grants remain supported; paid practice bypasses free limits without spending them.
- Backend api/access.py is authoritative for counters. It derives identity from the logged-in session or existing HttpOnly guest identity; transactions serialize updates, and task identifiers deduplicate retries. Limits persist across reloads, tabs, devices for signed-in users, progress resets, and logouts. Guest cookies can be cleared, so guest allowance is not abuse-proof. Downloadable content remains public; this is not server-side content secrecy.
- DAILY_LIMIT in api/access.py is the single product setting for later experiments. Intro limit is INTRO_LIMIT. New quota data is included in account exports/deletion and existing guest-retention cleanup.

## Validation

28 Python tests, five JavaScript suites, and the dedicated real-browser free-access flow, including all nine formats, guest reload persistence, signup, bonus/shared-pool accounting, and mobile layout. Existing A2/legal browser suites skip only first-visit guest onboarding, covered independently by access_browser.cjs.

## Deployment

Use deploy/deploy.sh --runtime-only for this release. It excludes the whole six-file legal configuration/manifest/document bundle, validates the current live bundle, creates a complete legal backup and hash list, verifies unchanged hashes after transfer, and restarts/checks the service. Full legal publication still requires the existing separate --release checks.
