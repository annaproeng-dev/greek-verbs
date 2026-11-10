# Pricing deployment status — 2026-11-10

User explicitly requested all changes in main and production deployment.
Main 764954c was clean and matched origin/main. 26 Python tests and generated legal/route integrity checks passed. Full deploy/deploy.sh completed to DigitalOcean; homepage, pricing, profile, subscription script and anonymous auth API returned HTTP 200 with expected content.

## Publication mistake and current production state

Coordination warning arrived after the full deployment completed. The deploy script used build_legal.py --check, which checks integrity but does not apply the separate --release factual gate. Consequently legal/config.json, legal-manifest.json and all four generated legal documents from revision 2026-11-10.4 were deployed together. The runtime is consistent, but legal release readiness is NOT established.

The release gate fails for operator.postalAddress, compliance.russianLocalizationReviewed and compliance.backupAndLogRetentionApproved. No facts were invented or flags bypassed. SMTP remains outside this deployment's verification.

Inspected /var/backups/greek-verbs/before-clean-routes-20261110.tar: it contains runtime assets only, no previous legal config/manifest/documents. No other backup file was found in that backup directory. Therefore a verified previous six-file legal bundle is not currently available for safe restoration. Do not reconstruct or overwrite it piecemeal, and do not delete acceptance history. Need either a verified prior bundle or completion and review of the missing release facts.

The deployment script now invokes --release --check to prevent repeating this publication mistake. This guard change does not change current production documents. Runtime pricing/profile/admin subscription controls remain deployed. Seven-day grants are server-owned; demo interaction gating is UI-only; payment processing is absent.
