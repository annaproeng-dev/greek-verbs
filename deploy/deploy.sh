#!/usr/bin/env bash

# Prepare a clean upload with rsync, then publish it through the Vercel CLI.
# Vercel has no SSH/rsync endpoint, so rsync is used locally for staging.

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
STAGING_DIR=""

PRODUCTION=false
KEEP_STAGING=false

usage() {
  cat <<'EOF'
Usage: ./deploy/deploy.sh [--prod] [--keep-staging]

  --prod            Deploy to the production environment.
  --keep-staging    Keep deploy/.vercel-upload after deployment.
  -h, --help        Show this help.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --prod|--production) PRODUCTION=true ;;
    --keep-staging) KEEP_STAGING=true ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$arg" >&2; usage >&2; exit 2 ;;
  esac
done

if ! command -v rsync >/dev/null 2>&1; then
  printf 'Error: rsync is required but was not found.\n' >&2
  exit 1
fi

# Prefer an installed CLI. Fall back to npx so a global installation is optional.
if command -v vercel >/dev/null 2>&1; then
  VERCEL=(vercel)
elif command -v npx >/dev/null 2>&1; then
  VERCEL=(npx --yes vercel@latest)
elif command -v pnpm >/dev/null 2>&1; then
  VERCEL=(pnpm dlx vercel@latest)
else
  printf 'Error: Vercel CLI is unavailable. Install Node.js and Vercel CLI first.\n' >&2
  exit 1
fi

cleanup() {
  if [[ "$KEEP_STAGING" == false && -n "$STAGING_DIR" && -d "$STAGING_DIR" ]]; then
    rm -rf -- "$STAGING_DIR"
  fi
}
trap cleanup EXIT

printf 'Checking Vercel authentication...\n'
if ! "${VERCEL[@]}" whoami >/dev/null 2>&1; then
  printf 'Vercel login is required. Starting the official login flow...\n'
  "${VERCEL[@]}" login
fi

# Link once and keep the generated .vercel/project.json in the project root.
if [[ ! -f "${PROJECT_ROOT}/.vercel/project.json" ]]; then
  printf 'Linking this folder to a Vercel project...\n'
  "${VERCEL[@]}" link --cwd "$PROJECT_ROOT"
fi

printf 'Preparing a clean upload with rsync...\n'
# Keep staging outside the Git repository so Vercel does not attach local
# commit-author metadata, which can block deployments for team projects.
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/greek-verbs-vercel-upload.XXXXXX")"
rsync -a --delete \
  --exclude '/deploy/' \
  --exclude '/.git/' \
  --exclude '/node_modules/' \
  --exclude '/.env*' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  "${PROJECT_ROOT}/" "${STAGING_DIR}/"

DEPLOY_ARGS=(deploy "$STAGING_DIR" --yes)
if [[ "$PRODUCTION" == true ]]; then
  DEPLOY_ARGS+=(--prod)
fi

printf 'Uploading to Vercel...\n'
DEPLOY_URL="$("${VERCEL[@]}" "${DEPLOY_ARGS[@]}")"
printf '\nDeployment complete:\n%s\n' "$DEPLOY_URL"
