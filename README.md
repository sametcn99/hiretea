# Hiretea

Hiretea is a self-hosted technical hiring workspace that supports two Gitea operating modes:

- Bundled mode: Docker Compose starts Hiretea, PostgreSQL, and a local Gitea instance together.
- External mode: Docker Compose starts only Hiretea and PostgreSQL locally, and Hiretea connects to an existing Gitea instance that you already manage elsewhere.

## Setup Modes

### Bundled Gitea

This is the default local development path.

1. Copy the sample environment file.

```bash
cp .env.example .env
```

1. Keep these defaults in `.env`:

```bash
COMPOSE_PROFILES="bundled-gitea"
HIRETEA_GITEA_MODE="bundled"
```

1. Start the full stack.

```bash
docker compose up --build
```

1. Open `http://localhost:3000` for Hiretea.

1. Open `http://localhost:3001` for the bundled Gitea instance.

Bundled startup does all of the following automatically:

- Boots PostgreSQL with separate application and Gitea databases.
- Starts a production-style Next.js container instead of `next dev`.
- Starts a bundled rootless Gitea instance on its own HTTP and SSH ports.
- Creates the first Gitea admin user if one does not exist.
- Generates or reuses a Gitea admin API token.
- Creates or reuses the default Gitea organization.
- Creates a dedicated OAuth application for Hiretea.
- Writes the runtime env contract that the app needs.
- Applies the Prisma schema and seeds the first internal admin/workspace settings.

### External Gitea

Use this mode when the team cloning the repo already has a Gitea instance running somewhere else.

1. Copy the sample environment file.

```bash
cp .env.example .env
```

1. Update `.env` so bundled Gitea does not start:

```bash
COMPOSE_PROFILES=""
HIRETEA_GITEA_MODE="external"
HIRETEA_CONFIG_ENCRYPTION_KEY="replace-with-a-long-random-app-encryption-key"
NEXTAUTH_SECRET="replace-with-a-long-random-string"
BOOTSTRAP_TOKEN="replace-with-a-bootstrap-token"
NEXTAUTH_URL="http://localhost:3000"
```

1. Start the local stack.

```bash
docker compose up --build
```

1. Open `http://localhost:3000/setup`.

1. Complete the setup form with your existing Gitea details:

- Public Gitea URL.
- Admin API URL if it differs from the public URL.
- Organization slug that should own generated repositories.
- OAuth client ID and client secret.
- Admin token with permission to manage users, repositories, collaborators, and webhooks.
- Webhook secret shared between Gitea and Hiretea.

External mode stores the Gitea admin token, OAuth client secret, and webhook secret encrypted in PostgreSQL. The application-level encryption key always stays in `HIRETEA_CONFIG_ENCRYPTION_KEY` and is never written into the database.

## Default Ports

| Service | Default |
| --- | --- |
| Hiretea HTTP | `http://localhost:3000` |
| Gitea HTTP | `http://localhost:3001` |
| Gitea SSH | `ssh://git@localhost:2221` |

In external mode, only the Hiretea HTTP port is used locally.

## External Gitea Prerequisites

Before using external mode, prepare the following in your existing Gitea instance:

- An admin token that can create candidate users, repositories, collaborator grants, and repository webhooks.
- An OAuth application whose redirect URI matches `${NEXTAUTH_URL}/api/auth/callback/gitea`.
- A target organization that Hiretea can use for generated repositories.
- Network reachability from Gitea to `POST ${NEXTAUTH_URL}/api/webhooks/gitea`.
- A webhook secret that you will also enter into the Hiretea setup form.

## Runtime Credentials

The runtime env contract is generated only in bundled mode.

The bundled compose stack writes the generated runtime contract into the shared Gitea config volume. You can inspect the current values from the running app container:

```bash
docker compose exec app /bin/sh -lc '. /runtime/gitea/hiretea.generated.env && env | grep -E "^(AUTH_GITEA_|GITEA_ADMIN_|NEXTAUTH_SECRET|GITEA_WEBHOOK_SECRET|hiretea_)"'
```

If `GITEA_ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, or `GITEA_WEBHOOK_SECRET` are set in `.env`, the bundled stack reapplies those exact values on every startup. If they are left unset, the runtime env file is the place to inspect the generated values.

## Optional Overrides

The sample environment file exposes the main knobs for both modes:

- Deployment mode: `COMPOSE_PROFILES`, `HIRETEA_GITEA_MODE`, `HIRETEA_CONFIG_ENCRYPTION_KEY`.
- Public ports and URLs: `APP_HTTP_PORT`, `GITEA_HTTP_PORT`, `GITEA_SSH_PORT`, `NEXTAUTH_URL`, `GITEA_PUBLIC_URL`.
- Database names and credentials: `HT_DB_*`, `GITEA_DB_*`.
- Bootstrap identity and workspace defaults: `GITEA_ADMIN_*`, `hiretea_*`, `GITEA_ORGANIZATION_NAME`.
- Stable secrets for repeatable environments: `NEXTAUTH_SECRET`, `GITEA_SECRET_KEY`, `GITEA_INTERNAL_TOKEN`, `GITEA_WEBHOOK_SECRET`.

If you change the public ports, keep the matching public URLs in sync. In bundled mode the app still uses `http://gitea:3000` internally while browsers must keep using the published Gitea URL.

## Useful Commands

```bash
docker compose up --build
COMPOSE_PROFILES="" HIRETEA_GITEA_MODE=external docker compose up --build
docker compose down
docker compose down -v
bun run smoke:test
bun run lint
bun run typecheck
bun run build
```

Use `docker compose down -v` when you want a completely fresh Hiretea and PostgreSQL state. In bundled mode that also removes the local Gitea state.

## Manual Setup Page

The `/setup` route is now the primary entry point for external mode. In bundled mode the compose flow should still complete bootstrap automatically before you reach it.

- Bundled mode: `/setup` mainly acts as a fallback if auto-bootstrap has not completed yet.
- External mode: `/setup` is required and collects the existing Gitea connection details that Hiretea needs.

## Troubleshooting

- If OAuth stays unavailable after external setup, verify `NEXTAUTH_SECRET` is present and the Gitea OAuth redirect URI exactly matches `${NEXTAUTH_URL}/api/auth/callback/gitea`.
- If validation fails for the admin token, confirm the token belongs to the admin user that owns the OAuth app and has repository management access for the target organization.
- If webhook delivery stays unavailable, verify Gitea can reach `${NEXTAUTH_URL}/api/webhooks/gitea` from its own network.
- If external mode reports missing encrypted credentials after a restart, confirm `HIRETEA_CONFIG_ENCRYPTION_KEY` is set to the same value that was used when the credentials were first stored.

## Architectural Rules

- The entire product is English-only, including code identifiers, documentation, and UI copy.
- Page layers stay thin and delegate business logic to dedicated domain services.
- Shared UI primitives live under `src/components/ui`; page-local components stay near their route segment.
- Zustand is reserved for client-side UI state only. Server data remains the source of truth on the server.
- Gitea integration details must stay inside the dedicated `src/lib/gitea` module boundary.
