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
  const isCandidate = summary.kind === "candidate";
  const overviewSignals: OverviewSignal[] = isCandidate
    ? [
        {
          label:
            summary.assignedCaseCount > 0
              ? "Assignments visible"
              : "No assignments yet",
          tone: summary.assignedCaseCount > 0 ? "positive" : "neutral",
        },
        {
          label:
            summary.repositoryCount > 0
              ? "Repository access issued"
              : "Repository access pending",
          tone:
            summary.repositoryCount > 0
              ? "positive"
              : summary.assignedCaseCount > 0
                ? "warning"
                : "neutral",
        },
        {
          label:
            summary.completedCaseCount > 0
              ? "Review outcomes available"
              : "Awaiting first review",
          tone: summary.completedCaseCount > 0 ? "positive" : "info",
        },
        {
          label: "Manual reviewer sync",
          tone: "info",
        },
      ]
    : [
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

  const checkpoints = isCandidate
    ? [
        "Assigned repository links and review detail now live under My cases in the sidebar.",
        "Review outcomes and final decisions are recorded in this workspace after internal review.",
        "Repository activity is not auto-synced yet, so status changes can lag behind what happens in Gitea.",
      ]
    : [
        "Onboarding links are still shared manually after provisioning, but resend history is now captured locally.",
        "The totals below are computed from live workspace records instead of placeholder values.",
        "Repository activity sync is still a follow-up increment even though webhook deliveries can already be captured.",
      ];

  const metrics: OverviewMetric[] = isCandidate
    ? [
        {
          label: "Cases assigned",
          value: summary.assignedCaseCount,
          detail: "Total hiring cases linked to your account.",
        },
        {
          label: "Repositories ready",
          value: summary.repositoryCount,
          detail: "Assignments with a working repository link.",
        },
        {
          label: "Active cases",
          value: summary.activeCaseCount,
          detail: "Assignments still in progress or under review.",
        },
        {
          label: "Completed reviews",
          value: summary.completedCaseCount,
          detail: "Cases marked complete in the workspace.",
        },
        {
          label: "Final decisions",
          value: summary.decidedCaseCount,
          detail: "Assignments with an advance, hold, or reject decision.",
        },
      ]
    : [
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
        description={
          isCandidate
            ? "Your assigned repositories, review outcomes, and current case load are tracked here."
            : "This overview now reflects live workspace data for provisioning, assignment, and review operations."
        }
        eyebrow="Protected route"
      >
        <Text as="p" size="2" color="gray" style={{ lineHeight: 1.7 }}>
          Your current role is <strong>{role.toLowerCase()}</strong>.{" "}
          {isCandidate
            ? "Use this workspace to find the repositories your team has assigned, check what is still being reviewed, and see when a final decision has been recorded. Repository activity is not auto-synced yet, so progress still advances through internal review actions."
            : "Candidate provisioning, template management, case assignment, and review totals below now read from live application data instead of placeholder values. Invite delivery remains manual-link based, but resend history is now visible while repository activity sync is still a follow-up increment."}
        </Text>
      </SectionCard>

      <SectionCard
        title={isCandidate ? "Your workspace status" : "Operational status"}
        eyebrow={isCandidate ? "Candidate view" : "Live signals"}
      >
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
        title={
          isCandidate
            ? "How the workspace behaves today"
            : "Current operating constraints"
        }
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
        title={isCandidate ? "Your current totals" : "Live workspace totals"}
        description={
          isCandidate
            ? "These totals are computed from the assignments and review records currently linked to your account."
            : "These totals are computed from the live candidate, template, assignment, review, and audit records in the workspace."
        }
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
