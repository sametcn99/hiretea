import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import Link from "next/link";
import { AppLogo } from "@/components/ui/app-logo";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type FeatureGroup = {
  eyebrow: string;
  title: string;
  description: string;
  features: { title: string; description: string }[];
};

const featureGroups: FeatureGroup[] = [
  {
    eyebrow: "Identity & access",
    title: "Authentication aligned with your Gitea instance",
    description:
      "Sign in stays inside your environment. Roles, sessions, and access checks all flow from your self-hosted Gitea identities.",
    features: [
      {
        title: "Gitea-backed NextAuth sign in",
        description:
          "OAuth against your own Gitea server with typed sessions and route-level guards across the dashboard.",
      },
      {
        title: "Role-based access control",
        description:
          "Built-in ADMIN, RECRUITER, and CANDIDATE roles with internal-role helpers for protected routes and server actions.",
      },
      {
        title: "Linked Gitea identities",
        description:
          "Each application user is linked to a Gitea login, profile, avatar, and initial credentials provisioned at account creation.",
      },
    ],
  },
  {
    eyebrow: "Workspace bootstrap",
    title: "First-run setup and runtime contract",
    description:
      "Hiretea boots itself: the Docker stack provisions Gitea, OAuth, secrets, and the database, then the app finalizes workspace metadata.",
    features: [
      {
        title: "Automated stack bootstrap",
        description:
          "Docker Compose seeds PostgreSQL, starts a rootless Gitea, creates the admin user, OAuth app, organization, and writes the runtime env contract.",
      },
      {
        title: "Manual /setup fallback",
        description:
          "A guarded setup page seeds the first internal admin and persists workspace metadata when automatic bootstrap is incomplete.",
      },
      {
        title: "Workspace settings management",
        description:
          "Company name, default branch, manual-invite mode, Gitea URLs, organization, and OAuth client are configurable from one settings surface.",
      },
    ],
  },
  {
    eyebrow: "Case templates",
    title: "Reusable Gitea-backed challenge definitions",
    description:
      "Define once, assign repeatedly. Templates link directly to Gitea repositories and carry their own reviewer guidance and rubric.",
    features: [
      {
        title: "Three repository sourcing modes",
        description:
          "Provision a fresh repository, link an existing one, or copy from an existing Gitea repository to seed a new template.",
      },
      {
        title: "Reviewer guide and rubric criteria",
        description:
          "Attach reviewer instructions, decision guidance, and weighted rubric criteria so every reviewer evaluates against the same bar.",
      },
      {
        title: "Reviewer assignments per template",
        description:
          "Assign default reviewers to a template so they are surfaced when new candidate cases are created from it.",
      },
    ],
  },
  {
    eyebrow: "Candidate operations",
    title: "Provision candidates and run the case lifecycle",
    description:
      "Create candidate accounts, assign cases, and progress them through a full status lifecycle without leaving the workspace.",
    features: [
      {
        title: "Candidate account provisioning",
        description:
          "Create candidate users with linked Gitea logins and initial passwords, ready to receive their first invite.",
      },
      {
        title: "Candidate case assignment",
        description:
          "Generate per-candidate working repositories from a template, set due dates, and track the full draft to completed lifecycle.",
      },
      {
        title: "Status, decision, and archive flow",
        description:
          "Cases move across DRAFT, PROVISIONING, READY, IN_PROGRESS, REVIEWING, COMPLETED, and ARCHIVED with ADVANCE, HOLD, and REJECT decisions plus restore support.",
      },
      {
        title: "Per-case access grants and revocation",
        description:
          "Grant and revoke candidate access to working repositories explicitly, with every change captured in the audit log.",
      },
    ],
  },
  {
    eyebrow: "Invitations",
    title: "Auditable invite issuance for candidates and recruiters",
    description:
      "Manual-link delivery stays explicit. Issuance, resends, and revocations are tokenized, expirable, and always recorded.",
    features: [
      {
        title: "Candidate invite issuance and claim",
        description:
          "Issue tokenized candidate invite links, claim them at /invite, and resurface the linked Gitea credentials on first sign in.",
      },
      {
        title: "Recruiter team invites",
        description:
          "Admins issue invites for new recruiting team members, claimed at /team-invite, with INITIAL and RESEND issuance kinds.",
      },
      {
        title: "Token hashing and expiry",
        description:
          "Invite tokens are hashed at rest, scoped to a single recipient, and expire on a defined window for both invite types.",
      },
      {
        title: "Revocation with audit trail",
        description:
          "Every issue, resend, and revoke action emits an audit log entry tied to the actor, recipient, and resource.",
      },
    ],
  },
  {
    eyebrow: "Reviews & evaluation",
    title: "Capture reviewer signal in the workspace",
    description:
      "Reviewers work against the same template guidance and rubric, with notes and decisions persisted alongside the case.",
    features: [
      {
        title: "Reviewer assignments per case",
        description:
          "Assign one or more reviewers to a candidate case, scoped per assignment with creator attribution.",
      },
      {
        title: "Evaluation notes",
        description:
          "Reviewers capture structured notes against a candidate case so review history stays in the workspace, not in chat.",
      },
      {
        title: "Review workflow surface",
        description:
          "A dedicated /dashboard/reviews route opens the review workflow per case once it has progressed far enough to be reviewed.",
      },
    ],
  },
  {
    eyebrow: "Gitea integration",
    title: "Deep, isolated Gitea integration",
    description:
      "Repository, organization, and webhook concerns stay inside the dedicated Gitea module so the rest of the app stays clean.",
    features: [
      {
        title: "Organization, repo, and user provisioning",
        description:
          "Create the workspace organization, candidate users, and per-case repositories using the admin API and webhook secrets.",
      },
      {
        title: "Repository activity surfacing",
        description:
          "Surface commits, pull requests, and migration progress for each candidate case directly inside its detail view.",
      },
      {
        title: "Signed Gitea webhooks",
        description:
          "POST /api/webhooks/gitea verifies HMAC-SHA256 signatures, persists supported deliveries, and records failed deliveries for triage.",
      },
      {
        title: "Runtime readiness checks",
        description:
          "The app continuously evaluates Gitea runtime configuration so missing OAuth, admin, or webhook config surfaces explicitly instead of failing silently.",
      },
    ],
  },
  {
    eyebrow: "Operations",
    title: "Audit, dashboards, and health for self-hosted operators",
    description:
      "The workspace surfaces the operational signals you need to run technical hiring on infrastructure you own.",
    features: [
      {
        title: "Live dashboard summary",
        description:
          "Counts for active candidates, templates, open assignments, review queue, completed reviews, and captured webhook deliveries are computed from live data.",
      },
      {
        title: "Append-only audit trail",
        description:
          "Provisioning, invites, access grants, revocations, and webhook events are written to a structured audit log queryable from the dashboard.",
      },
      {
        title: "Health endpoint",
        description:
          "GET /api/health verifies database connectivity and reports Gitea runtime readiness for liveness and readiness probes.",
      },
      {
        title: "Self-hosted Docker stack",
        description:
          "One Docker Compose file ships PostgreSQL, Gitea, and a production-style Next.js container with separate ports for app, Gitea HTTP, and Gitea SSH.",
      },
    ],
  },
];

const operationalHighlights = [
  {
    title: "Own your hiring infrastructure",
    description:
      "Hiretea stays inside your environment, plugs into your self-hosted Gitea instance, and keeps engineering challenges under your control.",
  },
  {
    title: "Provision candidate access with intent",
    description:
      "Create candidate accounts, assign repository permissions, and evolve access rules without leaving the hiring workspace.",
  },
  {
    title: "Audit every step of the case lifecycle",
    description:
      "Track repository creation, permission updates, captured webhook deliveries, and reviewer signals from a single operational surface.",
  },
];

export default function Page() {
  return (
    <Container size="3" py="7">
      <Grid
        columns={{
          initial: "1fr",
          md: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
        }}
        gap="5"
      >
        <Card size="3">
          <Flex direction="column" gap="5">
            <AppLogo />

            <Box>
              <Text
                size="1"
                weight="bold"
                color="blue"
                style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
              >
                Engineering case operations
              </Text>
              <Heading
                as="h1"
                size="8"
                mt="1"
                style={{ lineHeight: 0.96, letterSpacing: "-0.05em" }}
              >
                Run technical hiring through the Gitea stack your team already
                owns.
              </Heading>
            </Box>

            <Text
              as="p"
              size="3"
              color="gray"
              style={{ maxWidth: "58ch", lineHeight: 1.75 }}
            >
              Hiretea is a self-hosted control plane for technical assessments.
              Your hiring team provisions case repositories, candidate accounts,
              access grants, and review workflows against your own Gitea
              instance without outsourcing the workflow.
            </Text>

            <Flex gap="3" wrap="wrap">
              <Button asChild size="3">
                <Link href="/sign-in">Continue to sign in</Link>
              </Button>
              <Button asChild variant="outline" size="3">
                <Link href="/dashboard">Open the protected workspace</Link>
              </Button>
            </Flex>

            <Flex gap="2" wrap="wrap">
              <StatusBadge label="Dark mode only" tone="info" />
              <StatusBadge label="Self-hosted by default" tone="positive" />
              <StatusBadge label="English-only product copy" tone="neutral" />
              <StatusBadge label="Audit-first" tone="info" />
              <StatusBadge label="Role-based access" tone="neutral" />
            </Flex>
          </Flex>
        </Card>

        <Card size="3" asChild>
          <aside>
            <Flex direction="column" gap="4">
              <Flex justify="between" align="start" gap="3">
                <Box>
                  <Text
                    size="1"
                    weight="bold"
                    color="blue"
                    style={{
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    Foundation snapshot
                  </Text>
                  <Heading as="h2" size="4" mt="1">
                    What the platform ships with now
                  </Heading>
                </Box>
                <StatusBadge label="Operational baseline" tone="info" />
              </Flex>

              <Flex direction="column" gap="3">
                <Card variant="surface" size="1">
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="bold">
                      Auth boundary
                    </Text>
                    <Text size="2" color="gray">
                      NextAuth sign in against your Gitea instance with typed
                      session helpers and role-aware route protection.
                    </Text>
                  </Flex>
                </Card>
                <Card variant="surface" size="1">
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="bold">
                      Domain structure
                    </Text>
                    <Text size="2" color="gray">
                      Dedicated modules for Gitea, audit, candidates, cases,
                      templates, invites, evaluations, and permissions.
                    </Text>
                  </Flex>
                </Card>
                <Card variant="surface" size="1">
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="bold">
                      Self-host readiness
                    </Text>
                    <Text size="2" color="gray">
                      Docker Compose, PostgreSQL, Prisma, Gitea, and a generated
                      runtime env contract for repeatable deployments.
                    </Text>
                  </Flex>
                </Card>
              </Flex>
            </Flex>
          </aside>
        </Card>
      </Grid>

      <Grid
        columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
        gap="4"
        mt="6"
      >
        {operationalHighlights.map((highlight) => (
          <SectionCard
            key={highlight.title}
            title={highlight.title}
            description={highlight.description}
          />
        ))}
      </Grid>

      <Box mt="7">
        <Flex direction="column" gap="2" mb="5">
          <Text
            size="1"
            weight="bold"
            color="blue"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
          >
            Feature catalogue
          </Text>
          <Heading as="h2" size="6" style={{ letterSpacing: "-0.02em" }}>
            Everything Hiretea ships today
          </Heading>
          <Text as="p" size="3" color="gray" style={{ maxWidth: "70ch" }}>
            A grouped tour of the workflows, integrations, and operator tools
            that already live in the workspace.
          </Text>
        </Flex>

        <Flex direction="column" gap="5">
          {featureGroups.map((group) => (
            <SectionCard
              key={group.title}
              eyebrow={group.eyebrow}
              title={group.title}
              description={group.description}
            >
              <Separator size="4" my="2" />
              <Grid
                columns={{ initial: "1fr", sm: "repeat(2, minmax(0, 1fr))" }}
                gap="3"
                mt="3"
              >
                {group.features.map((feature) => (
                  <Card key={feature.title} variant="surface" size="2">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="bold">
                        {feature.title}
                      </Text>
                      <Text size="2" color="gray" style={{ lineHeight: 1.65 }}>
                        {feature.description}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </SectionCard>
          ))}
        </Flex>
      </Box>

      <Grid
        columns={{ initial: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
        gap="4"
        mt="6"
      >
        <SectionCard
          eyebrow="Initial workflow"
          title="How the workspace runs today"
        >
          <ol
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              display: "grid",
              gap: "0.7rem",
            }}
          >
            <li>
              <Text color="gray">
                Create case templates from new, linked, or copied Gitea
                repositories and attach reviewer guidance and rubric criteria.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Provision candidate accounts, generate per-candidate working
                repositories, and grant scoped repository access.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Issue tokenized invite links for candidates and recruiters, then
                track resends and revocations from the audit trail.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Capture reviewer notes and decisions while signed Gitea webhooks
                stream activity into the case timeline.
              </Text>
            </li>
          </ol>
        </SectionCard>

        <SectionCard
          eyebrow="Implementation posture"
          title="Why the codebase starts with strict boundaries"
        >
          <ol
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              display: "grid",
              gap: "0.7rem",
            }}
          >
            <li>
              <Text color="gray">
                Page layers stay thin and delegate to typed domain services
                under <code>src/lib</code>.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Gitea integration is sealed inside <code>src/lib/gitea</code>
                so the rest of the app never touches Gitea types directly.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Inputs are validated with Zod schemas per domain and mutations
                run inside server actions with explicit revalidation.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Tests are split into unit, Postgres-backed integration, and
                Docker-backed smoke layers for predictable CI gates.
              </Text>
            </li>
          </ol>
        </SectionCard>
      </Grid>
    </Container>
  );
}
