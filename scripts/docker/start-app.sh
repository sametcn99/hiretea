#!/bin/sh

set -eu

APP_MODE="${1:-start}"
RUNTIME_ENV_FILE="${hiretea_RUNTIME_ENV_FILE:-/runtime/gitea/hiretea.generated.env}"
WAIT_INTERVAL="${hiretea_RUNTIME_WAIT_INTERVAL:-2}"
WAIT_RETRIES="${hiretea_RUNTIME_WAIT_RETRIES:-120}"

if [ ! -f "$RUNTIME_ENV_FILE" ]; then
  echo "Waiting for generated runtime env at $RUNTIME_ENV_FILE..."
fi

attempt=0
while [ ! -f "$RUNTIME_ENV_FILE" ]; do
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
    exec bun run start --hostname "${hiretea_APP_HOST:-0.0.0.0}" --port "${hiretea_APP_PORT:-3000}"
    ;;
  *)
    exec "$@"
    ;;
esac