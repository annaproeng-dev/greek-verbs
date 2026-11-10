#!/usr/bin/env bash
# Upload Greek Verbs to the DigitalOcean VPS over SSH.
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'HELP'
Usage: ./deploy/deploy.sh [--dry-run]

Upload code to the DigitalOcean VPS using rsync over SSH.
Configuration: deploy/.env (see deploy/.env.example), or environment variables.
--dry-run  Preview changes; still connects over SSH, but writes no remote files.
-h, --help Show help.
HELP
}
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

# This is a trusted local shell configuration file; never upload it.
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  source "$SCRIPT_DIR/.env"
fi
DEPLOY_HOST="${DEPLOY_HOST:-161.35.40.15}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/greek-verbs}"
DEPLOY_PASSWORD="${DEPLOY_PASSWORD:-}"

# Restrict values that will be interpreted by the remote shell.
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo 'Invalid DEPLOY_HOST' >&2; exit 2; }
[[ "$DEPLOY_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]] || { echo 'Invalid DEPLOY_USER' >&2; exit 2; }
[[ "$DEPLOY_PORT" =~ ^[0-9]+$ ]] && (( 10#$DEPLOY_PORT > 0 && 10#$DEPLOY_PORT < 65536 )) || { echo 'Invalid DEPLOY_PORT' >&2; exit 2; }
[[ "$DEPLOY_PATH" =~ ^/[a-zA-Z0-9_/-]+$ && "$DEPLOY_PATH" != / && "$DEPLOY_PATH" != *..* ]] || { echo 'Invalid DEPLOY_PATH' >&2; exit 2; }

for command in rsync ssh; do
  command -v "$command" >/dev/null || { printf 'Required command missing: %s\n' "$command" >&2; exit 1; }
done
AUTH=(env)
ASKPASS_DIR=""
cleanup() {
  unset SSHPASS DEPLOY_PASSWORD
  if [[ -n "${RELEASE_FILES:-}" ]]; then rm -f -- "$RELEASE_FILES"; fi
  if [[ -n "$ASKPASS_DIR" ]]; then rm -rf -- "$ASKPASS_DIR"; fi
}
trap cleanup EXIT
if [[ -n "$DEPLOY_PASSWORD" ]]; then
  if command -v sshpass >/dev/null; then
    export SSHPASS="$DEPLOY_PASSWORD"
    AUTH=(sshpass -e)
  else
    ASKPASS_DIR="$(mktemp -d)"
    printf '#!/bin/sh\nprintf "%%s\\n" "$DEPLOY_PASSWORD"\n' > "$ASKPASS_DIR/askpass"
    chmod 700 "$ASKPASS_DIR/askpass"
    export DEPLOY_PASSWORD SSH_ASKPASS="$ASKPASS_DIR/askpass" SSH_ASKPASS_REQUIRE=force DISPLAY="${DISPLAY:-:0}"
  fi
fi
SSH=(ssh -p "$DEPLOY_PORT" -o StrictHostKeyChecking=ask -o ConnectTimeout=15)
TARGET="$DEPLOY_USER@$DEPLOY_HOST"

printf 'DigitalOcean: %s:%s\n' "$TARGET" "$DEPLOY_PATH"
if [[ "$DRY_RUN" == false ]]; then
  "${AUTH[@]}" "${SSH[@]}" "$TARGET" "mkdir -p -- '$DEPLOY_PATH'"
fi
OPTIONS=(-az --itemize-changes)
if [[ "$DRY_RUN" == true ]]; then OPTIONS+=(--dry-run); fi
# Do not delete remote files: the VPS may hold persistent data or configuration.
# Validate generated documents and use the same public manifest as the HTTP server.
python3 "$PROJECT_ROOT/scripts/build_legal.py" --check
python3 "$PROJECT_ROOT/scripts/build_routes.py" --check
RELEASE_FILES="$(mktemp)"
python3 "$PROJECT_ROOT/scripts/release_files.py" > "$RELEASE_FILES"
"${AUTH[@]}" rsync "${OPTIONS[@]}" --files-from="$RELEASE_FILES" \
  -e "ssh -p $DEPLOY_PORT -o StrictHostKeyChecking=ask -o ConnectTimeout=15" \
  "$PROJECT_ROOT/" "$TARGET:$DEPLOY_PATH/"
rm -f -- "$RELEASE_FILES"
if [[ "$DRY_RUN" == true ]]; then
  printf 'Preview complete. No remote files changed.\n'
else
  "${AUTH[@]}" "${SSH[@]}" "$TARGET" "systemctl try-restart greek-verbs.service"
  printf 'Upload complete: https://greekmaster.com/\n'
fi
