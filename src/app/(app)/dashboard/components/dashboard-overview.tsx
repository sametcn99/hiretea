import type { UserRole } from "@prisma/client";
import {
  ArrowRightIcon,
  CheckCircledIcon,
  ClockIcon,
  GitHubLogoIcon,
  LayersIcon,
  PersonIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
} from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DashboardSummary } from "@/lib/dashboard/queries";

type OverviewMetric = {
  label: string;
  value: number;
  detail: string;
  accent: string;
  icon: typeof PersonIcon;
};

type OverviewSignal = {
  label: string;
  tone: "info" | "neutral" | "positive" | "warning";
};

type QuickAction = {
  title: string;
  description: string;
  href: Route;
  cta: string;
  icon: typeof PersonIcon;
  metric: string;
};

type PipelineStage = {
  label: string;
  value: number;
  detail: string;
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
  const workspaceState =
    summary.candidateCount === 0 && summary.templateCount === 0
      ? {
          label: "Workspace needs its first records",
          detail:
            "Start by provisioning candidates and adding reusable case templates.",
          tone: "warning" as const,
        }
      : summary.reviewQueueCount > 0
        ? {
            label: "Reviews need attention",
            detail:
              "There are active assignments waiting on review progress right now.",
            tone: "info" as const,
          }
        : {
            label: "Operational flow looks healthy",
            detail:
              "Provisioning, template management, and active delivery are in sync.",
            tone: "positive" as const,
          };

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
    summary.candidateCount > 0
      ? `${summary.candidateCount} active candidate account${summary.candidateCount === 1 ? " is" : "s are"} available for assignment.`
      : "No active candidates are provisioned yet.",
    summary.templateCount > 0
      ? `${summary.templateCount} reusable case template${summary.templateCount === 1 ? " is" : "s are"} ready for delivery.`
      : "The template library is still empty.",
    summary.webhookDeliveryCount > 0
      ? `${summary.webhookDeliveryCount} webhook deliver${summary.webhookDeliveryCount === 1 ? "y has" : "ies have"} been captured for repository sync.`
      : "Webhook capture is configured, but no deliveries have been recorded yet.",
  ];

  const metrics: OverviewMetric[] = [
    {
      label: "Active candidates",
      value: summary.candidateCount,
      detail: "Provisioned candidate accounts ready for assignment.",
      accent:
        "linear-gradient(135deg, rgba(80, 160, 255, 0.16), rgba(80, 160, 255, 0))",
      icon: PersonIcon,
    },
    {
      label: "Case templates",
      value: summary.templateCount,
      detail: "Reusable Gitea-backed challenge definitions.",
      accent:
        "linear-gradient(135deg, rgba(74, 222, 128, 0.16), rgba(74, 222, 128, 0))",
      icon: LayersIcon,
    },
    {
      label: "Open assignments",
      value: summary.activeAssignmentCount,
      detail: "Candidate cases that are still being worked or reviewed.",
      accent:
        "linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(251, 191, 36, 0))",
      icon: ReaderIcon,
    },
    {
      label: "Review queue",
      value: summary.reviewQueueCount,
      detail: "Cases waiting on review progression.",
      accent:
        "linear-gradient(135deg, rgba(96, 165, 250, 0.16), rgba(96, 165, 250, 0))",
      icon: ClockIcon,
    },
    {
      label: "Completed reviews",
      value: summary.completedReviewCount,
      detail: "Assignments marked complete in the workspace.",
      accent:
        "linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(34, 197, 94, 0))",
      icon: CheckCircledIcon,
    },
    {
      label: "Webhook deliveries",
      value: summary.webhookDeliveryCount,
      detail:
        summary.webhookDeliveryCount > 0
          ? "Webhook events captured in the audit trail."
          : "No webhook deliveries have been captured yet.",
      accent:
        "linear-gradient(135deg, rgba(168, 85, 247, 0.16), rgba(168, 85, 247, 0))",
      icon: GitHubLogoIcon,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: "Candidates",
      description: "Provision accounts and keep onboarding moving.",
      href: "/dashboard/candidates",
      cta: "Open candidates",
      icon: PersonIcon,
      metric: `${summary.candidateCount} active`,
    },
    {
      title: "Case templates",
      description:
        "Maintain the reusable challenge library and reviewer guidance.",
      href: "/dashboard/case-templates",
      cta: "Open templates",
      icon: LayersIcon,
      metric: `${summary.templateCount} ready`,
    },
    {
      title: "Candidate cases",
      description: "Assign live workspaces and track delivery progress.",
      href: "/dashboard/candidate-cases",
      cta: "Open cases",
      icon: ReaderIcon,
      metric: `${summary.activeAssignmentCount} open`,
    },
    {
      title: "Reviews",
      description: "Move decisions forward and clear the review queue.",
      href: "/dashboard/reviews",
      cta: "Open reviews",
      icon: CheckCircledIcon,
      metric: `${summary.reviewQueueCount} queued`,
    },
  ];

  const pipelineStages: PipelineStage[] = [
    {
      label: "Provisioned",
      value: summary.candidateCount,
      detail: "Active candidate accounts available right now.",
      tone: summary.candidateCount > 0 ? "positive" : "warning",
    },
    {
      label: "In delivery",
      value: summary.activeAssignmentCount,
      detail: "Assignments currently in progress or under review.",
      tone: summary.activeAssignmentCount > 0 ? "info" : "neutral",
    },
    {
      label: "Ready for review",
      value: summary.reviewQueueCount,
      detail: "Cases that still need reviewer movement.",
      tone: summary.reviewQueueCount > 0 ? "warning" : "positive",
    },
    {
      label: "Closed out",
      value: summary.completedReviewCount,
      detail: "Reviews completed and recorded in the workspace.",
      tone: summary.completedReviewCount > 0 ? "positive" : "neutral",
    },
  ];

  return (
    <Grid
      columns={{ initial: "1fr", xl: "minmax(0, 1.7fr) minmax(320px, 0.9fr)" }}
      gap="4"
    >
      <SectionCard
        style={{ overflow: "hidden" }}
        title={`Welcome back, ${displayName}`}
        description="A live operations view across provisioning, challenge delivery, and review throughput."
        eyebrow="Workspace dashboard"
      >
        <Flex direction="column" gap="5">
          <Flex
            direction={{ initial: "column", lg: "row" }}
            justify="between"
            gap="4"
            align={{ initial: "start", lg: "end" }}
          >
            <Flex direction="column" gap="3" style={{ maxWidth: 620 }}>
              <Heading
                size="7"
                style={{ letterSpacing: "-0.04em", lineHeight: 1.02 }}
              >
                Keep the hiring workspace moving without losing operational
                context.
              </Heading>
              <Text as="p" size="3" color="gray" style={{ lineHeight: 1.7 }}>
                Your current role is <strong>{role.toLowerCase()}</strong>. This
                view rolls live provisioning, assignment, review, and webhook
                activity into one place so the next action is obvious instead of
                buried in individual sections.
              </Text>
            </Flex>

            <Card
              variant="surface"
              size="2"
              style={{
                minWidth: 280,
                backgroundImage:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent)",
              }}
            >
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="1">
                    <Text
                      size="1"
                      color="gray"
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Workspace state
                    </Text>
                    <Text size="4" weight="bold">
                      {workspaceState.label}
                    </Text>
                  </Flex>
                  <StatusBadge
                    label={
                      workspaceState.tone === "positive"
                        ? "Healthy"
                        : workspaceState.tone === "warning"
                          ? "Needs setup"
                          : "In motion"
                    }
                    tone={workspaceState.tone}
                  />
                </Flex>
                <Text size="2" color="gray">
                  {workspaceState.detail}
                </Text>
              </Flex>
            </Card>
          </Flex>

          <Flex wrap="wrap" gap="2">
            {overviewSignals.map((signal) => (
              <StatusBadge
                key={signal.label}
                label={signal.label}
                tone={signal.tone}
              />
            ))}
          </Flex>
        </Flex>
      </SectionCard>

      <SectionCard title="Operating notes" eyebrow="Right now">
        <Flex direction="column" gap="3">
          {checkpoints.map((checkpoint) => (
            <Flex key={checkpoint} gap="3" align="start">
              <Badge color="gray" variant="soft">
                Note
              </Badge>
              <Text color="gray" style={{ lineHeight: 1.65 }}>
                {checkpoint}
              </Text>
            </Flex>
          ))}
        </Flex>
      </SectionCard>

      <SectionCard
        style={{ gridColumn: "1 / -1" }}
        title="Live workspace totals"
        description="These totals are computed from the live candidate, template, assignment, review, and audit records in the workspace."
        eyebrow="Live data"
      >
        <Grid
          columns={{
            initial: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(3, minmax(0, 1fr))",
          }}
          gap="3"
        >
          {metrics.map((metric) => (
            <Card
              key={metric.label}
              variant="surface"
              size="2"
              style={{ backgroundImage: metric.accent }}
            >
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="1">
                    <Text size="2" color="gray">
                      {metric.label}
                    </Text>
                    <Text
                      size="7"
                      weight="bold"
                      style={{ letterSpacing: "-0.05em" }}
                    >
                      {metric.value}
                    </Text>
                  </Flex>
                  <metric.icon width="20" height="20" />
                </Flex>
                <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                  {metric.detail}
                </Text>
              </Flex>
            </Card>
          ))}
        </Grid>
      </SectionCard>

      <SectionCard
        style={{ gridColumn: "1 / -1" }}
        title="Workflow lanes"
        description="A simple live snapshot of where the hiring pipeline is accumulating volume."
        eyebrow="Pipeline"
      >
        <Grid
          columns={{
            initial: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          }}
          gap="3"
        >
          {pipelineStages.map((stage) => (
            <Card key={stage.label} variant="surface" size="2">
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center" gap="2">
                  <Text size="2" weight="medium">
                    {stage.label}
                  </Text>
                  <StatusBadge label={String(stage.value)} tone={stage.tone} />
                </Flex>
                <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                  {stage.detail}
                </Text>
              </Flex>
            </Card>
          ))}
        </Grid>
      </SectionCard>

      <SectionCard
        style={{ gridColumn: "1 / -1" }}
        title="Go to work"
        description="Jump into the area that needs action without scanning the whole navigation rail first."
        eyebrow="Quick actions"
      >
        <Grid
          columns={{ initial: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
          gap="3"
        >
          {quickActions.map((action) => (
            <Card key={action.title} variant="surface" size="2">
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="1">
                    <Text size="3" weight="bold">
                      {action.title}
                    </Text>
                    <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                      {action.description}
                    </Text>
                  </Flex>
                  <action.icon width="18" height="18" />
                </Flex>
                <Flex justify="between" align="center" gap="3">
                  <Badge variant="soft" color="gray">
                    {action.metric}
                  </Badge>
                  <Button asChild variant="soft" size="2">
                    <Link href={action.href}>
                      {action.cta}
                      <ArrowRightIcon width="16" height="16" />
                    </Link>
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Grid>
      </SectionCard>
    </Grid>
  );
}
