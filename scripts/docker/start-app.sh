#!/bin/sh

set -eu

APP_MODE="${1:-start}"
RUNTIME_ENV_FILE="${hiretea_RUNTIME_ENV_FILE:-/runtime/gitea/hiretea.generated.env}"
WAIT_INTERVAL="${hiretea_RUNTIME_WAIT_INTERVAL:-2}"
WAIT_RETRIES="${hiretea_RUNTIME_WAIT_RETRIES:-120}"

runtime_env_is_valid() {
  [ -f "$RUNTIME_ENV_FILE" ] &&
    env -i /bin/sh -ec '
      . "$1"

      case "${DATABASE_URL:-}" in
        postgres://*|postgresql://*) ;;
        *) exit 1 ;;
      esac

      case "${NEXTAUTH_URL:-}" in
        http://*|https://*) ;;
        *) exit 1 ;;
      esac
    ' sh "$RUNTIME_ENV_FILE" >/dev/null 2>&1
}

if ! runtime_env_is_valid; then
  echo "Waiting for generated runtime env at $RUNTIME_ENV_FILE..."
fi

attempt=0
while ! runtime_env_is_valid; do
  attempt=$((attempt + 1))

  if [ "$attempt" -ge "$WAIT_RETRIES" ]; then
    echo "Timed out waiting for generated runtime env file: $RUNTIME_ENV_FILE" >&2
    exit 1
  fi

  sleep "$WAIT_INTERVAL"
done

set -a
. "$RUNTIME_ENV_FILE"
set +a

echo "Applying Prisma schema..."
bun run db:push

echo "Ensuring bundled workspace bootstrap..."
bun run docker:auto-bootstrap

case "$APP_MODE" in
  dev)
    exec bun run dev --hostname "${hiretea_APP_HOST:-0.0.0.0}" --port "${hiretea_APP_PORT:-3000}"
    ;;
  start|prod|production)
    PORT="${hiretea_APP_PORT:-3000}" HOSTNAME="${hiretea_APP_HOST:-0.0.0.0}" exec bun ./server.js
    ;;
  *)
    exec "$@"
    ;;
esac
