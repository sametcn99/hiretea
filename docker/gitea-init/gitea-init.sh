#!/bin/bash

set -euo pipefail

require_env() {
  local name="$1"
  local value="${!name:-}"

  if [ -z "$value" ]; then
    echo "$name must be set before gitea-init can run." >&2
    exit 1
  fi

  printf '%s\n' "$value"
}

APP_INI="${GITEA_APP_INI:-/etc/gitea/app.ini}"
DATABASE_URL="$(require_env DATABASE_URL)"
GITEA_ADMIN_EMAIL="$(require_env GITEA_ADMIN_EMAIL)"
GITEA_ADMIN_NAME="$(require_env hiretea_ADMIN_NAME)"
GITEA_ADMIN_PASSWORD="$(require_env GITEA_ADMIN_PASSWORD)"
GITEA_ADMIN_TOKEN="${GITEA_ADMIN_TOKEN:-}"
GITEA_ADMIN_USERNAME="$(require_env GITEA_ADMIN_USERNAME)"
GITEA_INTERNAL_URL="${GITEA_INTERNAL_URL:-http://gitea:3000}"
GITEA_ORGANIZATION_NAME="$(require_env GITEA_ORGANIZATION_NAME)"
GITEA_PUBLIC_URL="$(require_env GITEA_PUBLIC_URL)"
GITEA_RUNTIME_ENV_FILE="${GITEA_RUNTIME_ENV_FILE:-/etc/gitea/hiretea.generated.env}"
GITEA_WEBHOOK_SECRET="$(require_env GITEA_WEBHOOK_SECRET)"
hiretea_COMPANY_NAME="$(require_env hiretea_COMPANY_NAME)"
hiretea_DEFAULT_BRANCH="$(require_env hiretea_DEFAULT_BRANCH)"
hiretea_MANUAL_INVITE_MODE="$(require_env hiretea_MANUAL_INVITE_MODE)"
NEXTAUTH_SECRET="$(require_env NEXTAUTH_SECRET)"
NEXTAUTH_URL="$(require_env NEXTAUTH_URL)"
AUTH_GITEA_ID="${AUTH_GITEA_ID:-}"
AUTH_GITEA_SECRET="${AUTH_GITEA_SECRET:-}"
GITEA_RECRUITER_TEAM_NAME="${GITEA_RECRUITER_TEAM_NAME:-hiretea-recruiters}"

CONFIG_DATABASE_URL="$DATABASE_URL"
CONFIG_GITEA_ADMIN_EMAIL="$GITEA_ADMIN_EMAIL"
CONFIG_GITEA_ADMIN_NAME="$GITEA_ADMIN_NAME"
CONFIG_GITEA_ADMIN_PASSWORD="$GITEA_ADMIN_PASSWORD"
CONFIG_GITEA_ADMIN_USERNAME="$GITEA_ADMIN_USERNAME"
CONFIG_GITEA_INTERNAL_URL="$GITEA_INTERNAL_URL"
CONFIG_GITEA_ORGANIZATION_NAME="$GITEA_ORGANIZATION_NAME"
CONFIG_GITEA_PUBLIC_URL="$GITEA_PUBLIC_URL"
CONFIG_GITEA_WEBHOOK_SECRET="$GITEA_WEBHOOK_SECRET"
CONFIG_hiretea_COMPANY_NAME="$hiretea_COMPANY_NAME"
CONFIG_hiretea_DEFAULT_BRANCH="$hiretea_DEFAULT_BRANCH"
CONFIG_hiretea_MANUAL_INVITE_MODE="$hiretea_MANUAL_INVITE_MODE"
CONFIG_NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
CONFIG_NEXTAUTH_URL="$NEXTAUTH_URL"

gitea_cmd() {
  gitea --config "$APP_INI" "$@"
}

quote_env_value() {
  jq -rn --arg value "${1:-}" '$value | @sh'
}

write_env_line() {
  local key="$1"
  local value="${2:-}"

  printf '%s=%s\n' "$key" "$(quote_env_value "$value")"
}

runtime_env_is_valid() {
  [ -f "$GITEA_RUNTIME_ENV_FILE" ] &&
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
    ' sh "$GITEA_RUNTIME_ENV_FILE" >/dev/null 2>&1
}

load_existing_runtime_env() {
  if [ -f "$GITEA_RUNTIME_ENV_FILE" ]; then
    if ! runtime_env_is_valid; then
      echo "Discarding invalid runtime env at $GITEA_RUNTIME_ENV_FILE."
      rm -f "$GITEA_RUNTIME_ENV_FILE"
      return
    fi

    set -a
    . "$GITEA_RUNTIME_ENV_FILE"
    set +a

    DATABASE_URL="$CONFIG_DATABASE_URL"
    GITEA_ADMIN_EMAIL="$CONFIG_GITEA_ADMIN_EMAIL"
    GITEA_ADMIN_NAME="$CONFIG_GITEA_ADMIN_NAME"
    GITEA_ADMIN_USERNAME="$CONFIG_GITEA_ADMIN_USERNAME"
    GITEA_INTERNAL_URL="$CONFIG_GITEA_INTERNAL_URL"
    GITEA_ORGANIZATION_NAME="$CONFIG_GITEA_ORGANIZATION_NAME"
    GITEA_PUBLIC_URL="$CONFIG_GITEA_PUBLIC_URL"
    hiretea_COMPANY_NAME="$CONFIG_hiretea_COMPANY_NAME"
    hiretea_DEFAULT_BRANCH="$CONFIG_hiretea_DEFAULT_BRANCH"
    hiretea_MANUAL_INVITE_MODE="$CONFIG_hiretea_MANUAL_INVITE_MODE"
    NEXTAUTH_URL="$CONFIG_NEXTAUTH_URL"

    if [ -n "$CONFIG_GITEA_ADMIN_PASSWORD" ]; then
      GITEA_ADMIN_PASSWORD="$CONFIG_GITEA_ADMIN_PASSWORD"
    fi

    if [ -n "$CONFIG_GITEA_WEBHOOK_SECRET" ]; then
      GITEA_WEBHOOK_SECRET="$CONFIG_GITEA_WEBHOOK_SECRET"
    fi

    if [ -n "$CONFIG_NEXTAUTH_SECRET" ]; then
      NEXTAUTH_SECRET="$CONFIG_NEXTAUTH_SECRET"
    fi
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

    if [ -n "$GITEA_ADMIN_PASSWORD" ]; then
      echo "Applying configured password for Gitea admin user $GITEA_ADMIN_USERNAME."
      gitea_cmd admin user change-password \
        --username "$GITEA_ADMIN_USERNAME" \
        --password "$GITEA_ADMIN_PASSWORD" \
        --must-change-password=false >/dev/null
    fi

    return 0
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

ensure_recruiter_team() {
  local existing_team_id

  existing_team_id="$(admin_api GET "/api/v1/orgs/$GITEA_ORGANIZATION_NAME/teams" \
    | jq -r --arg name "$GITEA_RECRUITER_TEAM_NAME" 'map(select(.name == $name)) | first | .id // empty')"

  if [ -n "$existing_team_id" ]; then
    echo "Reusing recruiting team $GITEA_RECRUITER_TEAM_NAME." >&2
    printf '%s\n' "$existing_team_id"
    return 0
  fi

  echo "Creating recruiting team $GITEA_RECRUITER_TEAM_NAME." >&2
  admin_api POST "/api/v1/orgs/$GITEA_ORGANIZATION_NAME/teams" "$(jq -nc \
    --arg name "$GITEA_RECRUITER_TEAM_NAME" \
    --arg description "Hiretea internal recruiting team members with full organization repo access." \
    '{name: $name, description: $description, permission: "admin", can_create_org_repo: true, includes_all_repositories: true}')" \
    | jq -r '.id'
}

ensure_admin_in_recruiter_team() {
  local team_id

  team_id="$(ensure_recruiter_team)"

  echo "Ensuring $GITEA_ADMIN_USERNAME belongs to $GITEA_RECRUITER_TEAM_NAME."
  admin_api PUT "/api/v1/teams/$team_id/members/$GITEA_ADMIN_USERNAME" >/dev/null
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

  {
    write_env_line "DATABASE_URL" "$DATABASE_URL"
    write_env_line "NEXTAUTH_URL" "$NEXTAUTH_URL"
    write_env_line "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
    write_env_line "AUTH_GITEA_ID" "$AUTH_GITEA_ID"
    write_env_line "AUTH_GITEA_SECRET" "$AUTH_GITEA_SECRET"
    write_env_line "AUTH_GITEA_ISSUER" "$GITEA_PUBLIC_URL"
    write_env_line "GITEA_ADMIN_BASE_URL" "$GITEA_INTERNAL_URL"
    write_env_line "GITEA_ADMIN_TOKEN" "$GITEA_ADMIN_TOKEN"
    write_env_line "GITEA_ADMIN_USERNAME" "$GITEA_ADMIN_USERNAME"
    write_env_line "GITEA_ADMIN_PASSWORD" "$GITEA_ADMIN_PASSWORD"
    write_env_line "GITEA_ORGANIZATION_NAME" "$GITEA_ORGANIZATION_NAME"
    write_env_line "GITEA_WEBHOOK_SECRET" "$GITEA_WEBHOOK_SECRET"
    write_env_line "hiretea_ADMIN_EMAIL" "$GITEA_ADMIN_EMAIL"
    write_env_line "hiretea_ADMIN_NAME" "$GITEA_ADMIN_NAME"
    write_env_line "hiretea_COMPANY_NAME" "$hiretea_COMPANY_NAME"
    write_env_line "hiretea_DEFAULT_BRANCH" "$hiretea_DEFAULT_BRANCH"
    write_env_line "hiretea_MANUAL_INVITE_MODE" "$hiretea_MANUAL_INVITE_MODE"
  } > "$tmp_file"

  mv "$tmp_file" "$GITEA_RUNTIME_ENV_FILE"
  chmod 600 "$GITEA_RUNTIME_ENV_FILE"
}

mkdir -p "$(dirname "$GITEA_RUNTIME_ENV_FILE")"
load_existing_runtime_env

wait_for_config
ensure_admin_user
wait_for_http
ensure_admin_token
ensure_org
ensure_admin_in_recruiter_team
ensure_oauth_app
write_runtime_env

echo "Hiretea runtime environment prepared at $GITEA_RUNTIME_ENV_FILE."
echo "Gitea admin user: $GITEA_ADMIN_USERNAME"
