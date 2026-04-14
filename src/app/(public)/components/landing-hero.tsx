import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
} from "@radix-ui/themes";
import Link from "next/link";
import { AppLogo } from "@/components/ui/app-logo";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

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

export function LandingHero() {
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
                      NextAuth-based sign in, route protection, and typed
                      session helpers.
                    </Text>
                  </Flex>
                </Card>
                <Card variant="surface" size="1">
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="bold">
                      Domain structure
                    </Text>
                    <Text size="2" color="gray">
                      Dedicated modules for Gitea, audit logging, permissions,
                      and database access.
                    </Text>
                  </Flex>
                </Card>
                <Card variant="surface" size="1">
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="bold">
                      Self-host readiness
                    </Text>
                    <Text size="2" color="gray">
                      Docker, PostgreSQL, Prisma, and explicit environment
                      contracts for deployment.
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
                Create template repositories in your Gitea organization and
                reuse them for candidate case generation.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Provision candidate access and generate a private working
                repository for each assignment.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Capture reviewer outcomes in the app while repository activity
                sync continues to mature.
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
                Page layers stay thin and delegate to domain services.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Shared UI primitives centralize styling decisions.
              </Text>
            </li>
            <li>
              <Text color="gray">
                New features can extend modules without rewriting existing
                flows.
              </Text>
            </li>
          </ol>
        </SectionCard>

        <SectionCard
          eyebrow="Operating model"
          title="Current operational constraints"
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
                Candidate credentials are still handed off manually during
                onboarding.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Review notes and final decisions are tracked in the app, while
                repository activity still depends on manual review cadence.
              </Text>
            </li>
            <li>
              <Text color="gray">
                The workspace surfaces live candidate, assignment, and review
                data instead of placeholder dashboard content.
              </Text>
            </li>
          </ol>
        </SectionCard>
      </Grid>
    </Container>
  );
}
