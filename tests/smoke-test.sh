#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="$ROOT_DIR/test-results/smoke"
ENV_FILE="$ROOT_DIR/.env"
ENV_BACKUP_FILE="$RESULTS_DIR/.env.backup"
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="hiretea"
APP_URL="http://localhost:3000"
GITEA_URL="http://localhost:3001"
APP_PORT=3000
GITEA_PORT=3001
MAX_RETRIES=120
WAIT_SECONDS=2
ORIGINAL_ENV_PRESENT=0

SMOKE_BOOTSTRAP_TOKEN="smoke_test_bootstrap_token_123"
SMOKE_NEXTAUTH_SECRET="smoke_test_nextauth_secret_123456789012345"
SMOKE_WEBHOOK_SECRET="smoke_test_webhook_secret_12345678901234"
SMOKE_ADMIN_EMAIL="admin@hiretea.local"
SMOKE_ADMIN_NAME="Hiretea Smoke Admin"
SMOKE_COMPANY_NAME="Hiretea Smoke Workspace"
SMOKE_DEFAULT_BRANCH="smoke-main"
SMOKE_GITEA_ADMIN_USERNAME="hiretea-smoke-admin"
SMOKE_GITEA_ADMIN_PASSWORD="HireTeaSmoke!23"
SMOKE_GITEA_ORGANIZATION="hiretea-smoke"

log() {
  printf "\n[%s] %s\n" "$(date +%H:%M:%S)" "$1"
}

compose() {
  (
    cd "$ROOT_DIR"
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
  )
}

cleanup_compose() {
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}

restore_env() {
  if [ "$ORIGINAL_ENV_PRESENT" -eq 1 ] && [ -f "$ENV_BACKUP_FILE" ]; then
    mv "$ENV_BACKUP_FILE" "$ENV_FILE"
    return
  fi

  rm -f "$ENV_FILE" "$ENV_BACKUP_FILE"
}

cleanup() {
  local exit_code=$?

  cleanup_compose
  restore_env

  exit "$exit_code"
}

trap cleanup EXIT

prepare_results() {
  rm -rf "$RESULTS_DIR"
  mkdir -p "$RESULTS_DIR"
}

backup_env() {
  mkdir -p "$RESULTS_DIR"

  if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP_FILE"
    ORIGINAL_ENV_PRESENT=1
  fi
}

write_env() {
  cat <<EOF > "$ENV_FILE"
NEXTAUTH_SECRET=$SMOKE_NEXTAUTH_SECRET
NEXTAUTH_URL=$APP_URL
BOOTSTRAP_TOKEN=$SMOKE_BOOTSTRAP_TOKEN
APP_HTTP_PORT=$APP_PORT
DB_PORT=5432
GITEA_HTTP_PORT=$GITEA_PORT
GITEA_PUBLIC_URL=$GITEA_URL
hiretea_ADMIN_EMAIL=$SMOKE_ADMIN_EMAIL
hiretea_ADMIN_NAME=$SMOKE_ADMIN_NAME
hiretea_COMPANY_NAME=$SMOKE_COMPANY_NAME
hiretea_DEFAULT_BRANCH=$SMOKE_DEFAULT_BRANCH
GITEA_ADMIN_EMAIL=$SMOKE_ADMIN_EMAIL
GITEA_ADMIN_USERNAME=$SMOKE_GITEA_ADMIN_USERNAME
GITEA_ADMIN_PASSWORD=$SMOKE_GITEA_ADMIN_PASSWORD
GITEA_ORGANIZATION_NAME=$SMOKE_GITEA_ORGANIZATION
GITEA_WEBHOOK_SECRET=$SMOKE_WEBHOOK_SECRET
EOF
}

save_logs() {
  local destination="$1"

  compose logs --timestamps > "$destination" 2>/dev/null || true
}

wait_for_url() {
  local url="$1"
  local destination="$2"
  local label="$3"
  local attempt=0
  local error_file="$RESULTS_DIR/${label}-wait-error.txt"

  : > "$error_file"

  until curl --silent --show-error --fail --location "$url" -o "$destination" 2>"$error_file"; do
    attempt=$((attempt + 1))

    if [ "$attempt" -ge "$MAX_RETRIES" ]; then
      save_logs "$RESULTS_DIR/${label}-timeout-logs.txt"
      if [ -s "$error_file" ]; then
        cat "$error_file" >&2
      fi
      echo "Timed out waiting for $label at $url" >&2
      return 1
    fi

    sleep "$WAIT_SECONDS"
  done

  rm -f "$error_file"
}

capture_response() {
  local url="$1"
  local body_file="$2"
  local header_file="$3"

  curl --silent --show-error --location --dump-header "$header_file" "$url" > "$body_file"
}

capture_headers() {
  local url="$1"
  local header_file="$2"

  curl --silent --show-error --head "$url" > "$header_file"
}

assert_contains() {
  local file="$1"
  local expected="$2"

  if ! grep -Fq "$expected" "$file"; then
    echo "Expected to find '$expected' in $file" >&2
    return 1
  fi
}

assert_header_contains() {
  local file="$1"
  local expected="$2"

  if ! grep -Fiq "$expected" "$file"; then
    echo "Expected to find header '$expected' in $file" >&2
    return 1
  fi
}

run_in_app() {
  local command="$1"

  compose exec -T app /bin/sh -lc "$command"
}

run_smoke() {
  log "Running smoke scenario"
  cleanup_compose
  write_env

  compose up -d --build

  wait_for_url "$APP_URL/sign-in" "$RESULTS_DIR/sign-in.html" "app"
  wait_for_url "$GITEA_URL/user/login" "$RESULTS_DIR/gitea-login.html" "gitea"

  capture_response "$APP_URL/sign-in" "$RESULTS_DIR/sign-in.html" "$RESULTS_DIR/sign-in.headers.txt"
  capture_headers "$APP_URL/setup" "$RESULTS_DIR/setup.headers.txt"
  capture_headers "$APP_URL/dashboard" "$RESULTS_DIR/dashboard.headers.txt"

  assert_contains "$RESULTS_DIR/sign-in.html" "Sign in with your Gitea identity"
  assert_contains "$RESULTS_DIR/sign-in.html" "OAuth configuration"
  assert_contains "$RESULTS_DIR/sign-in.html" "Ready"
  assert_header_contains "$RESULTS_DIR/setup.headers.txt" "location: /sign-in"
  assert_header_contains "$RESULTS_DIR/dashboard.headers.txt" "location: /sign-in"

  run_in_app "set -a && . /runtime/gitea/hiretea.generated.env && set +a && bun tests/assert-state.ts" \
    > "$RESULTS_DIR/assertions.txt"

  save_logs "$RESULTS_DIR/compose.log"
}

main() {
  prepare_results
  backup_env

  log "Preparing clean docker state"
  cleanup_compose

  run_smoke

  log "Smoke scenario completed successfully"
  printf "Artifacts: %s\n" "$RESULTS_DIR"
}

main "$@"
