import type { UserRole } from "@prisma/client";
import { Card, Flex, Grid, Text } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type DashboardOverviewProps = {
  displayName: string;
  role: UserRole;
};

export function DashboardOverview({
  displayName,
  role,
}: DashboardOverviewProps) {
  return (
    <Grid columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap="4">
      <SectionCard
        title={`Welcome back, ${displayName}`}
        description={
          "This screen is the first protected shell for the self-hosted product. It intentionally focuses on system posture instead of fake business data."
        }
        eyebrow="Protected route"
      >
        <Text as="p" size="2" color="gray" style={{ lineHeight: 1.7 }}>
          Your current role is <strong>{role.toLowerCase()}</strong>. As the
          product surface grows, this dashboard will branch into candidate
          provisioning, case repository operations, webhook monitoring, and
          reviewer workflows.
        </Text>
      </SectionCard>

      <SectionCard title="Readiness status" eyebrow="Foundation">
        <Flex wrap="wrap" gap="2">
          <StatusBadge label="Prisma connected by contract" tone="info" />
          <StatusBadge
            label="Gitea admin services scaffolded"
            tone="positive"
          />
          <StatusBadge label="Bootstrap flow ready" tone="positive" />
          <StatusBadge label="Assignment flow ready" tone="positive" />
          <StatusBadge label="Reviewer workflows ready" tone="positive" />
          <StatusBadge label="Settings screen ready" tone="positive" />
          <StatusBadge label="Webhook sync pending" tone="warning" />
        </Flex>
      </SectionCard>

      <SectionCard
        style={{ gridColumn: "span 2" }}
        title="Implementation checkpoints"
        eyebrow="Next steps"
      >
        <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.75rem" }}>
          <li><Text color="gray">Connect the real Gitea OAuth application credentials.</Text></li>
          <li>
            <Text color="gray">
              Add webhook-driven synchronization for repository activity and
              candidate case state.
            </Text>
          </li>
          <li>
            <Text color="gray">
              Add operational metrics and summaries that read from real candidate,
              assignment, and review data.
            </Text>
          </li>
        </ol>
      </SectionCard>

      <SectionCard title="Initial operating metrics" eyebrow="Planned widgets">
        <Flex direction="column" gap="3">
          <Card variant="surface" size="1">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">Candidate accounts provisioned</Text>
              <Text size="5" weight="bold">0</Text>
            </Flex>
          </Card>
          <Card variant="surface" size="1">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">Case repositories attached</Text>
              <Text size="5" weight="bold">0</Text>
            </Flex>
          </Card>
          <Card variant="surface" size="1">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">Webhook deliveries tracked</Text>
              <Text size="5" weight="bold">0</Text>
            </Flex>
          </Card>
        </Flex>
      </SectionCard>
    </Grid>
  );
}
