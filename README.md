# Hiretea

[![Test](https://github.com/sametcn99/hiretea/actions/workflows/test.yml/badge.svg)](https://github.com/sametcn99/hiretea/actions/workflows/test.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

Hiretea is a self-hosted platform for running technical assessments end to end. Define case templates against your own Gitea repositories, provision candidate accounts, assign per-candidate working repositories, capture reviewer signal, and keep an auditable trail of every state transition.

It bundles Gitea as the code host and uses PostgreSQL as the data store — everything runs behind your own firewall, with no external SaaS dependencies.

## Who is it for?

- **Hiring teams** who want full control over their technical assessment pipeline without sending candidate data to third-party services.
- **Engineering managers & recruiters** who need structured case assignments, reviewer guides, rubrics, and decision tracking in one place.
- **Candidates** who receive a repository to work in, push code via standard `git`, and optionally open pull requests to submit their work for review.

## How it works

1. **Bootstrap** — On first boot, the stack automatically sets up PostgreSQL, initializes Gitea with an admin account, registers an OAuth application, applies the database schema, and seeds the first workspace admin. A manual `/setup` page is also available as a fallback.

2. **Create templates** — Admins define case templates that point to Git repositories. A template can provision a brand-new repo, link an existing one, or copy from an existing repository. Each template carries reviewer assignments, review guides, and rubric criteria with weighted scores.

3. **Provision candidates** — Recruiters provision candidate accounts, which automatically creates a Gitea user with an initial password and a linked identity record. Invite links (with token hashing, expiration, and revocation) are generated for onboarding.

4. **Assign cases** — Assigning a template to a candidate creates a working repository (mirrored from the template), grants the candidate write access, registers a webhook for status tracking, and persists the case row in `READY` status.

5. **Candidate works** — The candidate pushes code to their working repository. Webhook deliveries automatically advance the case status: first push → `IN_PROGRESS`, review-submission PR → `REVIEWING`.

6. **Review & decide** — Reviewers access the review workflow, see the template guide and rubric, leave evaluation notes with scores and summaries, and finalize the case with a decision (`ADVANCE`, `HOLD`, or `REJECT`).

7. **Audit** — Every meaningful mutation (provisioning, status changes, access grants, invite lifecycle, webhook deliveries) is recorded in an append-only audit log.

## Key features

- **Case templates** — Create reusable challenge definitions from Git repositories (provision new, link existing, or copy from existing).
- **Candidate provisioning** — Provision candidate accounts on Gitea, assign working repositories, and manage per-permission access grants.
- **Invitations** — Token-based invite links for candidates and recruiters, with hash-at-rest tokens, expiration, revocation, and resend tracking.
- **Review workflow** — Assign reviewers, attach evaluation notes with rubric criteria and weighted scores, and track decisions (advance / hold / reject).
- **Webhook-driven status tracking** — Candidate case statuses advance automatically based on pushes and pull requests via signed Gitea webhooks.
- **Audit trail** — Every meaningful mutation is recorded in an append-only audit log, viewable from the dashboard.
- **Candidate completion tracking** — Cases can be marked complete manually or automatically when deadlines pass, with observable login tracking from Gitea.
- **Dark-mode-first UI** — Built with Radix Themes, English-only interface.

## Quick start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Bun](https://bun.sh/) (for running helper scripts)

### Setup

1. Copy the sample environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` — at minimum, change these secrets for any non-local deployment:

   ```text
   NEXTAUTH_SECRET=<random-secret>
   BOOTSTRAP_TOKEN=<random-secret>
   GITEA_ADMIN_PASSWORD=<strong-password>
   GITEA_SECRET_KEY=<random-secret>
   GITEA_INTERNAL_TOKEN=<random-secret>
   GITEA_WEBHOOK_SECRET=<random-secret>
   ```

3. Start the stack:

   ```bash
   bun run docker:up
   ```

4. Open [http://localhost:3000](http://localhost:3000) for Hiretea.
5. Open [http://localhost:3001](http://localhost:3001) for Gitea.

Startup is fully automatic: PostgreSQL is provisioned, Gitea is initialized with an admin account and OAuth application, the database schema is applied, and the first workspace admin is seeded.

### Default ports

| Service    | URL / Port                 | Purpose              |
| ---------- | -------------------------- | -------------------- |
| Hiretea    | `http://localhost:3000`    | Application          |
| Gitea HTTP | `http://localhost:3001`    | Browser-facing Git   |
| Gitea SSH  | `ssh://git@localhost:2221` | Candidate `git push` |
| PostgreSQL | `localhost:5432`           | Shared database      |

## Running in production

### Environment

All secrets should be explicitly pinned in `.env` (or your environment management tool) for production deployments. When `NEXTAUTH_SECRET`, `GITEA_SECRET_KEY`, `GITEA_INTERNAL_TOKEN`, `GITEA_WEBHOOK_SECRET`, `BOOTSTRAP_TOKEN`, and `GITEA_ADMIN_PASSWORD` are set, the `gitea-init` service reapplies those exact values on every startup, ensuring stable credentials across restarts.

If any secret is left unset, `gitea-init` generates one on first boot and writes it to the `gitea-config` volume. You can inspect the generated runtime values from a running container:

```bash
docker compose -p hiretea exec app /bin/sh -lc \
  '. /runtime/gitea/hiretea.generated.env && env | grep -E "^(AUTH_GITEA_|GITEA_ADMIN_|NEXTAUTH_SECRET|GITEA_WEBHOOK_SECRET|hiretea_)"'
```

### Build targets

The Docker Compose file supports two build targets controlled by environment variables:

- **Production** (default): `HIRETEA_APP_BUILD_TARGET=production`, `HIRETEA_APP_MODE=start`
- **Development with hot reload**: `HIRETEA_APP_BUILD_TARGET=development`, `HIRETEA_APP_MODE=dev`

The Dockerfile defines four stages: `base` (dependency installation), `development` (dev server with hot reload), `builder` (production build), and `production` (minimal runtime image copying built artifacts from `builder`).

Use the watch command for development:

```bash
bun run docker:watch
```

### Health checks

`GET /api/health` returns `{ ok, databaseReady, runtimeReadiness }`. The Docker healthcheck uses this endpoint. In production, point your load balancer or orchestrator at this route.

### OAuth and webhooks

Hiretea authenticates internal users through Gitea OAuth. The `gitea-init` service automatically registers the OAuth application and writes the client ID/secret into the runtime env. Ensure:

- `NEXTAUTH_URL` matches the externally reachable URL of your Hiretea instance.
- `GITEA_PUBLIC_URL` matches the externally reachable URL of your Gitea instance.
- Gitea can reach `POST ${NEXTAUTH_URL}/api/webhooks/gitea` from the Docker network for webhook delivery.

### Database

PostgreSQL 16 is included in the Compose stack. For production, consider using an external managed PostgreSQL instance and setting `DATABASE_URL` accordingly.

### Reset

To wipe all data and start fresh:

```bash
docker compose -p hiretea down --volumes --remove-orphans --rmi all || true
```

## License

Hiretea is released under the [GNU General Public License v3.0](LICENSE).

---

For technical details, architecture, and contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
