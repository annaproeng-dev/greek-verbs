# Integration contract: legal/account privacy and server learning

The legal task adds `api/legal.py`, generated legal documents, `legal-manifest.json`, `account-privacy.js` and account actions in `api/auth.py`. PostgreSQL migration is simultaneously changing storage in the same working directory. The latest user request requires integrating both on main.

Required invariants for the shared implementation:

- `delete_account` must delete `learning` for `user:<id>` in the same database transaction as users, legal_acceptances, sessions and reset tokens. After deletion the browser must NOT issue authenticated learning requests with the revoked session.
- `export_data` must include server learning data. No passwords, session tokens or password-reset hashes in exports.
- A failed pending save must not permanently prevent switching identities or deleting an account. Queue failure must be surfaced but explicitly recoverable on successful account reload.
- Clearing progress must invalidate stale-tab writes; a CAS retry that merges stale deltas into a cleared record resurrects erased data. Use a reset generation separate from ordinary write revision.
- Migration needs a server-owned once-only marker; localStorage-only markers can cause reimport of deleted data after clearing site preferences. Leave legacy data until confirmed migration, but do not reimport it after server reset.
- Privacy docs must say learning data is server-side and account progress syncs across devices; IndexedDB remains a migration source only. Guest cookie, expiry and retention must be documented.
- Public resource list is now public-files.json; deploy uses scripts/release_files.py. Deployment must include legal/config.json, legal-manifest.json and all generated documents because api/legal.py verifies them at startup.

Operator confirmed country Russia and city Saint Petersburg. Full postal address is not supplied. Do not invent it or claim complete legal readiness.
