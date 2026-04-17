# Hiretea

Hiretea is a self-hosted technical hiring workspace. Docker Compose starts Hiretea, PostgreSQL, and Gitea together.

## Setup

1. Copy the sample environment file.

```bash
cp .env.example .env
```

1. Start the stack.

```bash
bun run docker:up
# or: docker compose -p hiretea -f docker-compose.yml up --build -d && bun run docker:wait
```

1. Open `http://localhost:3000` for Hiretea.

1. Open `http://localhost:3001` for Gitea.

Startup does all of the following automatically:

- Boots PostgreSQL with separate application and Gitea databases.
- Starts a production-style Next.js container instead of `next dev`.
- Starts a rootless Gitea instance on its own HTTP and SSH ports.
- Creates the first Gitea admin user if one does not exist.
- Generates or reuses a Gitea admin API token.
- Creates or reuses the default Gitea organization.
- Creates a dedicated OAuth application for Hiretea.
- Writes the runtime env contract that the app needs.
- Applies the Prisma schema and seeds the first internal admin and workspace settings.

## Default Ports

| Service | Default |
| --- | --- |
| Hiretea HTTP | `http://localhost:3000` |
| Gitea HTTP | `http://localhost:3001` |
| Gitea SSH | `ssh://git@localhost:2221` |

## Runtime Credentials

The compose stack writes the generated runtime contract into the Gitea config volume. You can inspect the current values from the running app container:

```bash
docker compose -p hiretea -f docker-compose.yml exec app /bin/sh -lc '. /runtime/gitea/hiretea.generated.env && env | grep -E "^(AUTH_GITEA_|GITEA_ADMIN_|NEXTAUTH_SECRET|GITEA_WEBHOOK_SECRET|hiretea_)"'
```

If `GITEA_ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, or `GITEA_WEBHOOK_SECRET` are set in `.env`, the stack reapplies those exact values on every startup. If they are left unset, the runtime env file is the place to inspect the generated values.

## Optional Overrides

The example environment file exposes the main knobs for the stack:

- Shared app settings: `APP_HTTP_PORT`, `DB_PORT`, `HT_DB_*`, `NEXTAUTH_URL`, `hiretea_*`, `GITEA_ORGANIZATION_NAME`.
- Gitea settings: `GITEA_HTTP_PORT`, `GITEA_SSH_PORT`, `GITEA_PUBLIC_URL`, `GITEA_DOMAIN`, `GITEA_DB_*`, `GITEA_ADMIN_*`, `GITEA_SECRET_KEY`, `GITEA_INTERNAL_TOKEN`, `GITEA_WEBHOOK_SECRET`.
- Stable secrets for repeatable environments: `NEXTAUTH_SECRET`, `BOOTSTRAP_TOKEN`, `GITEA_SECRET_KEY`, `GITEA_INTERNAL_TOKEN`, `GITEA_WEBHOOK_SECRET`.

If you change the public ports, keep the matching public URLs in sync. The app still uses `http://gitea:3000` internally while browsers must keep using the published Gitea URL.

## Useful Commands

```bash
bun run docker:up
bun run docker:wait
bun run docker:watch
bun run smoke:test
bun run test:unit
bun run test:integration
bun run test:smoke
bun run test:ci
bun run lint
bun run typecheck
bun run build
```


## Testing Workflow

Hiretea now separates test layers by purpose instead of relying on a single smoke script for everything.

- `bun run test:unit`: fast pure-module coverage for runtime config and other decision helpers.
- `bun run test:integration`: real PostgreSQL-backed service tests that validate bootstrap and workspace settings behavior.
- `bun run test:smoke`: full-stack Docker verification that the app, health endpoint, and bundled Gitea are reachable.
- `bun run test:ci`: the pull-request gate for lint, typecheck, unit tests, and integration tests.

The smoke suite is intentionally narrow. It confirms the bundled stack starts and exposes the expected public surfaces, but deeper business assertions live in the integration suite.

## Manual Setup Page

The `/setup` route is a fallback path if automatic bootstrap has not completed yet.

- `/setup` seeds the first internal admin and persists the workspace metadata used by candidate provisioning and template flows.
- OAuth, admin token, and webhook values continue to come from the generated runtime contract instead of user-entered secrets.

## Troubleshooting

- If OAuth stays unavailable after bootstrap, verify `NEXTAUTH_SECRET` is present and the Gitea OAuth redirect URI exactly matches `${NEXTAUTH_URL}/api/auth/callback/gitea`.
- If candidate case assignment fails during repository migration, confirm Gitea is running with `GITEA__migrations__ALLOW_LOCALNETWORKS=true` and `GITEA__server__LOCAL_ROOT_URL=http://gitea:3000/`.
- If webhook delivery stays unavailable, verify Gitea can reach `POST ${NEXTAUTH_URL}/api/webhooks/gitea` from the Docker network.
- Use `docker compose -p hiretea -f docker-compose.yml down --volumes --remove-orphans --rmi all || true` when you want a completely fresh Hiretea state.

## Architectural Rules

- The entire product is English-only, including code identifiers, documentation, and UI copy.
- Page layers stay thin and delegate business logic to dedicated domain services.
- Shared UI primitives live under `src/components/ui`; page-local components stay near their route segment.
- Zustand is reserved for client-side UI state only. Server data remains the source of truth on the server.
- Gitea integration details must stay inside the dedicated `src/lib/gitea` module boundary.
