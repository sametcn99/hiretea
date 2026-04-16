import type { UserRole } from "@prisma/client";
import { Card, Flex, Grid, Text } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DashboardSummary } from "@/lib/dashboard/queries";

type OverviewMetric = {
  label: string;
  value: number;
  detail: string;
};

type OverviewSignal = {
  label: string;
  tone: "info" | "neutral" | "positive" | "warning";
};

type DashboardOverviewProps = {
  displayName: string;
  role: UserRole;
  summary: DashboardSummary;
};

export function DashboardOverview({
  displayName,
  role,
  summary,
}: DashboardOverviewProps) {
  const overviewSignals: OverviewSignal[] = [
    {
      label: "Candidate provisioning live",
      tone: "positive",
    },
    {
      label: "Template library live",
      tone: "positive",
    },
    {
      label: "Assignment flow live",
      tone: "positive",
    },
    {
      label: "Auditable invite resend flow",
      tone: "info",
    },
    {
      label:
        summary.webhookDeliveryCount > 0
          ? `${summary.webhookDeliveryCount} webhook deliveries captured`
          : "Repository activity sync pending",
      tone: summary.webhookDeliveryCount > 0 ? "positive" : "warning",
    },
  ];

  const checkpoints = [
    "Onboarding links are still shared manually after provisioning, but resend history is now captured locally.",
    "The totals below are computed from live workspace records instead of placeholder values.",
    "Repository activity sync is still a follow-up increment even though webhook deliveries can already be captured.",
  ];

  const metrics: OverviewMetric[] = [
    {
      label: "Active candidates",
      value: summary.candidateCount,
      detail: "Provisioned candidate accounts ready for assignment.",
    },
    {
      label: "Case templates",
      value: summary.templateCount,
      detail: "Reusable Gitea-backed challenge definitions.",
    },
    {
      label: "Open assignments",
      value: summary.activeAssignmentCount,
      detail: "Candidate cases that are still being worked or reviewed.",
    },
    {
      label: "Review queue",
      value: summary.reviewQueueCount,
      detail: "Cases waiting on review progression.",
    },
    {
      label: "Completed reviews",
      value: summary.completedReviewCount,
      detail: "Assignments marked complete in the workspace.",
    },
    {
      label: "Webhook deliveries",
      value: summary.webhookDeliveryCount,
      detail:
        summary.webhookDeliveryCount > 0
          ? "Webhook events captured in the audit trail."
          : "No webhook deliveries have been captured yet.",
    },
  ];

  return (
    <Grid columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap="4">
      <SectionCard
        title={`Welcome back, ${displayName}`}
        description="This overview now reflects live workspace data for provisioning, assignment, and review operations."
        eyebrow="Protected route"
      >
        <Text as="p" size="2" color="gray" style={{ lineHeight: 1.7 }}>
          Your current role is <strong>{role.toLowerCase()}</strong>. Candidate
          provisioning, template management, case assignment, and review totals
          below now read from live application data instead of placeholder
          values. Invite delivery remains manual-link based, but resend history
          is now visible while repository activity sync is still a follow-up
          increment.
        </Text>
      </SectionCard>

      <SectionCard title="Operational status" eyebrow="Live signals">
        <Flex wrap="wrap" gap="2">
          {overviewSignals.map((signal) => (
            <StatusBadge
              key={signal.label}
              label={signal.label}
              tone={signal.tone}
            />
          ))}
        </Flex>
      </SectionCard>

      <SectionCard
        style={{ gridColumn: "1 / -1" }}
        title="Current operating constraints"
        eyebrow="Now"
      >
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.1rem",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          {checkpoints.map((checkpoint) => (
            <li key={checkpoint}>
              <Text color="gray">{checkpoint}</Text>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard
        style={{ gridColumn: "1 / -1" }}
        title="Live workspace totals"
        description="These totals are computed from the live candidate, template, assignment, review, and audit records in the workspace."
        eyebrow="Live data"
      >
        <Grid
          columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
          gap="3"
        >
          {metrics.map((metric) => (
            <Card key={metric.label} variant="surface" size="1">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">
                  {metric.label}
                </Text>
                <Text size="5" weight="bold">
                  {metric.value}
                </Text>
                <Text size="1" color="gray">
                  {metric.detail}
                </Text>
              </Flex>
            </Card>
          ))}
        </Grid>
      </SectionCard>
    </Grid>
  );
}
