#!/bin/sh

set -eu

create_role() {
  local role_name="$1"
  local role_password="$2"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO
\$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$role_name') THEN
    CREATE ROLE "$role_name" LOGIN PASSWORD '$role_password';
  ELSE
    ALTER ROLE "$role_name" WITH LOGIN PASSWORD '$role_password';
  END IF;
END
\$\$;
SQL
}

create_database() {
  local database_name="$1"
  local owner_name="$2"

  if ! psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$database_name'" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" | grep -q 1; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE \"$database_name\" OWNER \"$owner_name\""
  fi

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "GRANT ALL PRIVILEGES ON DATABASE \"$database_name\" TO \"$owner_name\""
}

create_role "$HT_DB_USER" "$HT_DB_PASSWORD"
create_role "$GITEA_DB_USER" "$GITEA_DB_PASSWORD"
create_database "$HT_DB_NAME" "$HT_DB_USER"
create_database "$GITEA_DB_NAME" "$GITEA_DB_USER"