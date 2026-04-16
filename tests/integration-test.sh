#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="hiretea-test"
TEST_DB_PORT=55432
TEST_DATABASE_URL="postgresql://hiretea:hiretea@127.0.0.1:${TEST_DB_PORT}/hiretea?schema=public"
MAX_RETRIES=60
WAIT_SECONDS=1

compose() {
  (
    cd "$ROOT_DIR"
    DB_PORT="$TEST_DB_PORT" docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
  )
}

cleanup() {
  compose down --volumes --remove-orphans >/dev/null 2>&1 || true
}

wait_for_database() {
  local attempt=0

  until compose exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; do
    attempt=$((attempt + 1))

    if [ "$attempt" -ge "$MAX_RETRIES" ]; then
      compose logs db >&2 || true
      echo "Timed out waiting for the integration database." >&2
      return 1
    fi

    sleep "$WAIT_SECONDS"
  done
}

main() {
  trap cleanup EXIT

  cleanup
  compose up -d db
  wait_for_database

  export NODE_ENV="test"
  export DATABASE_URL="$TEST_DATABASE_URL"
  export BOOTSTRAP_TOKEN="integration-test-bootstrap-token"
  export RUN_INTEGRATION_TESTS="1"

  (
    cd "$ROOT_DIR"
    bun run db:push
    vitest run --config vitest.integration.config.ts
  )
}

main "$@"