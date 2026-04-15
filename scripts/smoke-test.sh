#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="$ROOT_DIR/test-results/smoke"
ENV_FILE="$ROOT_DIR/.env"
ENV_BACKUP_FILE="$RESULTS_DIR/.env.backup"
BUNDLED_COMPOSE_FILE="docker-compose.bundled.yml"
EXTERNAL_COMPOSE_FILE="docker-compose.external.yml"
BUNDLED_PROJECT_NAME="hiretea-bundled"
EXTERNAL_PROJECT_NAME="hiretea-external"
APP_URL="http://localhost:3000"
GITEA_URL="http://localhost:3001"
APP_PORT=3000
GITEA_PORT=3001
EXTERNAL_DB_PORT=5433
MAX_RETRIES=120
WAIT_SECONDS=2
ORIGINAL_ENV_PRESENT=0

SMOKE_BOOTSTRAP_TOKEN="smoke_test_bootstrap_token_123"
SMOKE_CONFIG_ENCRYPTION_KEY="smoke_test_config_key_12345678901234567890"
SMOKE_NEXTAUTH_SECRET="smoke_test_nextauth_secret_123456789012345"
SMOKE_WEBHOOK_SECRET="smoke_test_webhook_secret_12345678901234"
SMOKE_ADMIN_EMAIL="admin@hiretea.local"
SMOKE_ADMIN_NAME="Hiretea Smoke Admin"
SMOKE_COMPANY_NAME="Hiretea Smoke Workspace"
SMOKE_DEFAULT_BRANCH="smoke-main"
SMOKE_GITEA_ADMIN_USERNAME="hiretea-smoke-admin"
SMOKE_GITEA_ADMIN_PASSWORD="HireTeaSmoke!23"
SMOKE_GITEA_ORGANIZATION="hiretea-smoke"

bundled_results_dir() {
  printf "%s/bundled" "$RESULTS_DIR"
}

external_results_dir() {
  printf "%s/external" "$RESULTS_DIR"
}

log() {
  printf "\n[%s] %s\n" "$(date +%H:%M:%S)" "$1"
}

cleanup_compose() {
  (
    cd "$ROOT_DIR"
    docker compose -p "$EXTERNAL_PROJECT_NAME" -f "$EXTERNAL_COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
    docker compose -p "$BUNDLED_PROJECT_NAME" -f "$BUNDLED_COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
  )
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
  mkdir -p "$(bundled_results_dir)" "$(external_results_dir)"
}

backup_env() {
  mkdir -p "$RESULTS_DIR"

  if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP_FILE"
    ORIGINAL_ENV_PRESENT=1
  fi
}

write_bundled_env() {
  cat <<EOF > "$ENV_FILE"
HIRETEA_CONFIG_ENCRYPTION_KEY=$SMOKE_CONFIG_ENCRYPTION_KEY
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

write_external_env() {
  cat <<EOF > "$ENV_FILE"
HIRETEA_CONFIG_ENCRYPTION_KEY=$SMOKE_CONFIG_ENCRYPTION_KEY
NEXTAUTH_SECRET=$SMOKE_NEXTAUTH_SECRET
NEXTAUTH_URL=$APP_URL
BOOTSTRAP_TOKEN=$SMOKE_BOOTSTRAP_TOKEN
APP_HTTP_PORT=$APP_PORT
DB_PORT=$EXTERNAL_DB_PORT
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
EOF
}

compose_bundled() {
  (
    cd "$ROOT_DIR"
    docker compose -p "$BUNDLED_PROJECT_NAME" -f "$BUNDLED_COMPOSE_FILE" "$@"
  )
}

compose_external() {
  (
    cd "$ROOT_DIR"
    docker compose -p "$EXTERNAL_PROJECT_NAME" -f "$EXTERNAL_COMPOSE_FILE" "$@"
  )
}

save_logs() {
  local target="$1"
  local destination="$2"

  case "$target" in
    bundled)
      compose_bundled logs --timestamps > "$destination"
      ;;
    external)
      compose_external logs --timestamps > "$destination"
      ;;
    all)
      compose_bundled logs --timestamps > "${destination%.txt}.bundled.txt" 2>/dev/null || true
      compose_external logs --timestamps > "${destination%.txt}.external.txt" 2>/dev/null || true
      ;;
  esac
}

wait_for_url() {
  local url="$1"
  local destination="$2"
  local label="$3"
  local attempt=0

  until curl --silent --show-error --fail --location "$url" -o "$destination"; do
    attempt=$((attempt + 1))

    if [ "$attempt" -ge "$MAX_RETRIES" ]; then
      save_logs all "$RESULTS_DIR/${label}-timeout-logs.txt"
      echo "Timed out waiting for $label at $url" >&2
      return 1
    fi

    sleep "$WAIT_SECONDS"
  done
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

  compose_bundled exec -T app /bin/sh -lc "$command"
}

bundled_runtime_env() {
  compose_bundled exec -T gitea /bin/sh -lc 'cat /etc/gitea/hiretea.generated.env' |
    sed "s#^GITEA_ADMIN_BASE_URL=.*#GITEA_ADMIN_BASE_URL='http://host.docker.internal:${GITEA_PORT}'#"
}

run_in_external_app() {
  local command="$1"

  bundled_runtime_env |
    compose_external exec -T -e SMOKE_COMMAND="$command" app /bin/sh -lc '
      cat > /tmp/hiretea.generated.env
      set -a
      . /tmp/hiretea.generated.env
      set +a
      eval "$SMOKE_COMMAND"
    '
}

run_bundled_mode() {
  local mode_dir
  mode_dir="$(bundled_results_dir)"

  log "Running bundled smoke scenario"
  cleanup_compose
  write_bundled_env

  compose_bundled up -d --build

  wait_for_url "$APP_URL/sign-in" "$mode_dir/sign-in.html" "bundled-app"
  wait_for_url "$GITEA_URL/user/login" "$mode_dir/gitea-login.html" "bundled-gitea"

  capture_response "$APP_URL/sign-in" "$mode_dir/sign-in.html" "$mode_dir/sign-in.headers.txt"
  capture_headers "$APP_URL/setup" "$mode_dir/setup.headers.txt"
  capture_headers "$APP_URL/dashboard" "$mode_dir/dashboard.headers.txt"

  assert_contains "$mode_dir/sign-in.html" "Sign in with your Gitea identity"
  assert_contains "$mode_dir/sign-in.html" "OAuth configuration"
  assert_contains "$mode_dir/sign-in.html" "Ready"
  assert_header_contains "$mode_dir/setup.headers.txt" "location: /sign-in"
  assert_header_contains "$mode_dir/dashboard.headers.txt" "location: /sign-in"

  run_in_app "set -a && . /runtime/gitea/hiretea.generated.env && set +a && bun scripts/smoke/assert-state.ts --phase bundled-ready" \
    > "$mode_dir/assertions.txt"

  save_logs bundled "$mode_dir/compose.log"
}

run_external_mode() {
  local mode_dir
  mode_dir="$(external_results_dir)"

  log "Running external smoke scenario"
  cleanup_compose

  write_bundled_env
  compose_bundled up -d --build db db-init gitea gitea-init
  wait_for_url "$GITEA_URL/user/login" "$mode_dir/gitea-login.html" "external-gitea"

  write_external_env
  compose_external up -d --build app

  wait_for_url "$APP_URL/setup" "$mode_dir/setup-pre-bootstrap.html" "external-app"

  capture_headers "$APP_URL/sign-in" "$mode_dir/sign-in-pre-bootstrap.headers.txt"
  capture_response "$APP_URL/setup" "$mode_dir/setup-pre-bootstrap.html" "$mode_dir/setup-pre-bootstrap.headers.txt"
  capture_headers "$APP_URL/dashboard" "$mode_dir/dashboard-pre-bootstrap.headers.txt"

  assert_header_contains "$mode_dir/sign-in-pre-bootstrap.headers.txt" "location: /setup"
  assert_contains "$mode_dir/setup-pre-bootstrap.html" "Workspace setup"
  assert_contains "$mode_dir/setup-pre-bootstrap.html" "Admin token"
  assert_contains "$mode_dir/setup-pre-bootstrap.html" "OAuth client secret"
  assert_contains "$mode_dir/setup-pre-bootstrap.html" "Webhook secret"
  assert_header_contains "$mode_dir/dashboard-pre-bootstrap.headers.txt" "location: /sign-in"

  run_in_external_app "bun scripts/smoke/assert-state.ts --phase external-pre-setup" \
    > "$mode_dir/pre-setup-assertions.txt"

  run_in_external_app "bun scripts/smoke/complete-external-bootstrap.ts --expect-invalid-token" \
    > "$mode_dir/invalid-token-check.txt"

  run_in_external_app "bun scripts/smoke/assert-state.ts --phase external-pre-setup" \
    > "$mode_dir/pre-setup-after-invalid-token-assertions.txt"

  run_in_external_app "bun scripts/smoke/complete-external-bootstrap.ts" \
    > "$mode_dir/bootstrap.txt"

  capture_response "$APP_URL/sign-in" "$mode_dir/sign-in-post-bootstrap.html" "$mode_dir/sign-in-post-bootstrap.headers.txt"
  capture_headers "$APP_URL/setup" "$mode_dir/setup-post-bootstrap.headers.txt"

  assert_contains "$mode_dir/sign-in-post-bootstrap.html" "Sign in with your Gitea identity"
  assert_contains "$mode_dir/sign-in-post-bootstrap.html" "Ready"
  assert_header_contains "$mode_dir/setup-post-bootstrap.headers.txt" "location: /sign-in"

  run_in_external_app "bun scripts/smoke/assert-state.ts --phase external-post-setup" \
    > "$mode_dir/post-setup-assertions.txt"

  save_logs all "$mode_dir/compose.log"
}

main() {
  prepare_results
  backup_env

  log "Preparing clean docker state"
  cleanup_compose

  run_bundled_mode
  run_external_mode

  log "Smoke test suite completed successfully"
  printf "Artifacts: %s\n" "$RESULTS_DIR"
}

main "$@"
