# Hiretea

Hiretea is a self-hosted technical hiring workspace that now ships with its own local Gitea, PostgreSQL, OAuth application bootstrap, and first-run workspace seeding inside one Docker Compose stack.

## One-Command Stack

1. Copy the optional override file.

```bash
cp .env.example .env
```

1. Start the full stack.

```bash
docker compose up --build
```

1. Open `http://localhost:3000` for Hiretea.

1. Open `http://localhost:3001` for the bundled Gitea instance.

That startup does all of the following automatically:

- Boots PostgreSQL with separate application and Gitea databases.
- Starts a production-style Next.js container instead of `next dev`.
- Starts a bundled rootless Gitea instance on its own HTTP and SSH ports.
- Creates the first Gitea admin user if one does not exist.
- Generates or reuses a Gitea admin API token.
- Creates or reuses the default Gitea organization.
- Creates a dedicated OAuth application for Hiretea.
- Writes the runtime env contract that the app needs.
- Applies the Prisma schema and seeds the first internal admin/workspace settings.

## Default Ports

| Service | Default |
| --- | --- |
| Hiretea HTTP | `http://localhost:3000` |
| Gitea HTTP | `http://localhost:3001` |
| Gitea SSH | `ssh://git@localhost:2221` |

## Runtime Credentials

The compose stack writes the generated runtime contract into the shared Gitea config volume. You can inspect the current values from the running app container:

```bash
docker compose exec app /bin/sh -lc '. /runtime/gitea/hiretea.generated.env && env | grep -E "^(AUTH_GITEA_|GITEA_ADMIN_|NEXTAUTH_SECRET|GITEA_WEBHOOK_SECRET|hiretea_)"'
```

That is the place to read the generated Gitea admin password if you did not pin `GITEA_ADMIN_PASSWORD` in `.env`.

## Optional Overrides

The bundled flow runs without extra configuration, but `.env.example` exposes the main knobs:

- Public ports and URLs: `APP_HTTP_PORT`, `GITEA_HTTP_PORT`, `GITEA_SSH_PORT`, `NEXTAUTH_URL`, `GITEA_PUBLIC_URL`.
- Database names and credentials: `HT_DB_*`, `GITEA_DB_*`.
- Bootstrap identity and workspace defaults: `GITEA_ADMIN_*`, `hiretea_*`, `GITEA_ORGANIZATION_NAME`.
- Stable secrets for repeatable environments: `NEXTAUTH_SECRET`, `GITEA_SECRET_KEY`, `GITEA_INTERNAL_TOKEN`, `GITEA_WEBHOOK_SECRET`.

If you change the public ports, keep the matching public URLs in sync. The app still uses `http://gitea:3000` internally while browsers must keep using `AUTH_GITEA_ISSUER` through the published Gitea URL.

## Useful Commands

```bash
docker compose up --build
docker compose down
docker compose down -v
bun run lint
bun run typecheck
bun run build
```

Use `docker compose down -v` when you want a completely fresh Hiretea, PostgreSQL, and Gitea state.

## Manual Setup Page

The `/setup` route still exists for manual environments, but the bundled compose flow should complete bootstrap automatically before you reach it. If you do open `/setup`, it now prefers the public Gitea issuer URL over the internal admin URL when pre-filling defaults.

## Architectural Rules

- The entire product is English-only, including code identifiers, documentation, and UI copy.
- Page layers stay thin and delegate business logic to dedicated domain services.
- Shared UI primitives live under `src/components/ui`; page-local components stay near their route segment.
- Zustand is reserved for client-side UI state only. Server data remains the source of truth on the server.
- Gitea integration details must stay inside the dedicated `src/lib/gitea` module boundary.
