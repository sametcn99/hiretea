#!/bin/bash

set -euo pipefail

APP_INI="${GITEA_APP_INI:-/etc/gitea/app.ini}"
DATABASE_URL="${DATABASE_URL:-postgresql://hiretea:hiretea@db:5432/hiretea?schema=public}"
GITEA_ADMIN_EMAIL="${GITEA_ADMIN_EMAIL:-admin@hiretea.local}"
GITEA_ADMIN_NAME="${hiretea_ADMIN_NAME:-Hiretea Admin}"
GITEA_ADMIN_PASSWORD="${GITEA_ADMIN_PASSWORD:-}"
GITEA_ADMIN_TOKEN="${GITEA_ADMIN_TOKEN:-}"
GITEA_ADMIN_USERNAME="${GITEA_ADMIN_USERNAME:-hiretea-admin}"
GITEA_INTERNAL_URL="${GITEA_INTERNAL_URL:-http://gitea:3000}"
GITEA_ORGANIZATION_NAME="${GITEA_ORGANIZATION_NAME:-hiretea}"
GITEA_PUBLIC_URL="${GITEA_PUBLIC_URL:-http://localhost:3001}"
GITEA_RUNTIME_ENV_FILE="${GITEA_RUNTIME_ENV_FILE:-/etc/gitea/hiretea.generated.env}"
GITEA_WEBHOOK_SECRET="${GITEA_WEBHOOK_SECRET:-}"
hiretea_COMPANY_NAME="${hiretea_COMPANY_NAME:-Hiretea Workspace}"
hiretea_DEFAULT_BRANCH="${hiretea_DEFAULT_BRANCH:-main}"
hiretea_MANUAL_INVITE_MODE="${hiretea_MANUAL_INVITE_MODE:-true}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-}"
NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
AUTH_GITEA_ID="${AUTH_GITEA_ID:-}"
AUTH_GITEA_SECRET="${AUTH_GITEA_SECRET:-}"

gitea_cmd() {
  gitea --config "$APP_INI" "$@"
}

random_hex() {
  od -An -tx1 -N32 /dev/urandom | tr -d ' \n'
}

load_existing_runtime_env() {
  if [ -f "$GITEA_RUNTIME_ENV_FILE" ]; then
    set -a
    . "$GITEA_RUNTIME_ENV_FILE"
    set +a
  fi
}

wait_for_config() {
  echo "Waiting for Gitea configuration at $APP_INI..."

  for _ in $(seq 1 120); do
    if [ -f "$APP_INI" ]; then
      return 0
    fi

    sleep 2
  done

  echo "Timed out waiting for Gitea to render $APP_INI." >&2
  exit 1
}

wait_for_http() {
  echo "Waiting for Gitea API at $GITEA_INTERNAL_URL..."

  for _ in $(seq 1 120); do
    if curl -fsS "$GITEA_INTERNAL_URL/user/login" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
  done

  echo "Timed out waiting for the Gitea web service." >&2
  exit 1
}

ensure_admin_user() {
  if gitea_cmd admin user list | awk 'NR > 1 { print $2 }' | grep -Fxq "$GITEA_ADMIN_USERNAME"; then
    echo "Reusing existing Gitea admin user $GITEA_ADMIN_USERNAME."
    return 0
  fi

  if [ -z "$GITEA_ADMIN_PASSWORD" ]; then
    GITEA_ADMIN_PASSWORD="Ht!$(random_hex | cut -c1-24)Aa1"
  fi

  echo "Creating Gitea admin user $GITEA_ADMIN_USERNAME."
  gitea_cmd admin user create \
    --username "$GITEA_ADMIN_USERNAME" \
    --password "$GITEA_ADMIN_PASSWORD" \
    --email "$GITEA_ADMIN_EMAIL" \
    --admin \
    --must-change-password=false >/dev/null
}

admin_api() {
  local method="$1"
  local path="$2"
  local payload="${3:-}"

  if [ -n "$payload" ]; then
    curl -fsS \
      -X "$method" \
      -H "Authorization: token $GITEA_ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$GITEA_INTERNAL_URL$path"
    return
  fi

  curl -fsS \
    -X "$method" \
    -H "Authorization: token $GITEA_ADMIN_TOKEN" \
    "$GITEA_INTERNAL_URL$path"
}

ensure_admin_token() {
  if [ -n "$GITEA_ADMIN_TOKEN" ] && admin_api GET "/api/v1/user" >/dev/null 2>&1; then
    echo "Reusing existing Gitea admin token."
    return 0
  fi

  echo "Generating a fresh Gitea admin token."
  GITEA_ADMIN_TOKEN="$({
    gitea_cmd admin user generate-access-token \
      --username "$GITEA_ADMIN_USERNAME" \
      --token-name "hiretea-runtime-$(date +%s)" \
      --scopes all \
      --raw
  })"
}

ensure_org() {
  if admin_api GET "/api/v1/orgs/$GITEA_ORGANIZATION_NAME" >/dev/null 2>&1; then
    echo "Reusing existing Gitea organization $GITEA_ORGANIZATION_NAME."
    return 0
  fi

  echo "Creating Gitea organization $GITEA_ORGANIZATION_NAME."
  admin_api POST "/api/v1/admin/users/$GITEA_ADMIN_USERNAME/orgs" "$(jq -nc \
    --arg username "$GITEA_ORGANIZATION_NAME" \
    --arg fullName "$hiretea_COMPANY_NAME" \
    '{username: $username, full_name: $fullName, visibility: "private"}')" >/dev/null
}

oauth_app_exists() {
  if [ -z "$AUTH_GITEA_ID" ]; then
    return 1
  fi

  admin_api GET "/api/v1/user/applications/oauth2" \
    | jq -e --arg clientId "$AUTH_GITEA_ID" 'map(select(.client_id == $clientId)) | length > 0' >/dev/null
}

ensure_oauth_app() {
  if oauth_app_exists; then
    echo "Reusing existing Hiretea OAuth application."
    return 0
  fi

  local response
  local redirectUri="${NEXTAUTH_URL%/}/api/auth/callback/gitea"

  echo "Creating a dedicated OAuth application for Hiretea."
  response="$(admin_api POST "/api/v1/user/applications/oauth2" "$(jq -nc \
    --arg name "hiretea-${GITEA_ORGANIZATION_NAME}-$(date +%s)" \
    --arg redirectUri "$redirectUri" \
    '{name: $name, confidential_client: true, redirect_uris: [$redirectUri]}')")"

  AUTH_GITEA_ID="$(printf '%s' "$response" | jq -r '.client_id')"
  AUTH_GITEA_SECRET="$(printf '%s' "$response" | jq -r '.client_secret')"
}

write_runtime_env() {
  local tmp_file

  tmp_file="$(mktemp "${GITEA_RUNTIME_ENV_FILE}.XXXXXX")"

  cat > "$tmp_file" <<EOF
DATABASE_URL=$DATABASE_URL
NEXTAUTH_URL=$NEXTAUTH_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
AUTH_GITEA_ID=$AUTH_GITEA_ID
AUTH_GITEA_SECRET=$AUTH_GITEA_SECRET
AUTH_GITEA_ISSUER=$GITEA_PUBLIC_URL
GITEA_ADMIN_BASE_URL=$GITEA_INTERNAL_URL
GITEA_ADMIN_TOKEN=$GITEA_ADMIN_TOKEN
GITEA_ADMIN_USERNAME=$GITEA_ADMIN_USERNAME
GITEA_ADMIN_PASSWORD=$GITEA_ADMIN_PASSWORD
GITEA_ORGANIZATION_NAME=$GITEA_ORGANIZATION_NAME
GITEA_WEBHOOK_SECRET=$GITEA_WEBHOOK_SECRET
hiretea_ADMIN_EMAIL=$GITEA_ADMIN_EMAIL
hiretea_ADMIN_NAME=$GITEA_ADMIN_NAME
hiretea_COMPANY_NAME=$hiretea_COMPANY_NAME
hiretea_DEFAULT_BRANCH=$hiretea_DEFAULT_BRANCH
hiretea_MANUAL_INVITE_MODE=$hiretea_MANUAL_INVITE_MODE
EOF

  mv "$tmp_file" "$GITEA_RUNTIME_ENV_FILE"
  chmod 600 "$GITEA_RUNTIME_ENV_FILE"
}

mkdir -p "$(dirname "$GITEA_RUNTIME_ENV_FILE")"
load_existing_runtime_env

if [ -z "$NEXTAUTH_SECRET" ]; then
  NEXTAUTH_SECRET="$(random_hex)"
fi

if [ -z "$GITEA_WEBHOOK_SECRET" ]; then
  GITEA_WEBHOOK_SECRET="$(random_hex)"
fi

wait_for_config
ensure_admin_user
wait_for_http
ensure_admin_token
ensure_org
ensure_oauth_app
write_runtime_env

echo "Hiretea runtime environment prepared at $GITEA_RUNTIME_ENV_FILE."
echo "Gitea admin user: $GITEA_ADMIN_USERNAME"