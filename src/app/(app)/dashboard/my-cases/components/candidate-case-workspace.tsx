import { Card, Flex, Grid, Link as RadixLink, Text } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateWorkspaceCaseListItem } from "@/lib/candidate-cases/queries";

type CandidateCaseWorkspaceProps = {
  candidateCases: CandidateWorkspaceCaseListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusToneMap = {
  DRAFT: "neutral",
  PROVISIONING: "info",
  READY: "positive",
  IN_PROGRESS: "info",
  REVIEWING: "warning",
  COMPLETED: "positive",
  ARCHIVED: "neutral",
} as const;

const decisionToneMap = {
  ADVANCE: "positive",
  HOLD: "neutral",
  REJECT: "warning",
} as const;

const activeStatuses = new Set(["READY", "IN_PROGRESS", "REVIEWING"]);

export function CandidateCaseWorkspace({
  candidateCases,
}: CandidateCaseWorkspaceProps) {
  const repositoryCount = candidateCases.filter(
    (candidateCase) => candidateCase.workingRepositoryUrl,
  ).length;
  const activeCount = candidateCases.filter((candidateCase) =>
    activeStatuses.has(candidateCase.status),
  ).length;
  const completedCount = candidateCases.filter(
    (candidateCase) => candidateCase.status === "COMPLETED",
  ).length;
  const decidedCount = candidateCases.filter(
    (candidateCase) => candidateCase.decision,
  ).length;

  return (
    <Flex direction="column" gap="4">
      <Grid
        columns={{ initial: "1fr", md: "repeat(4, minmax(0, 1fr))" }}
        gap="3"
      >
        <Card variant="surface" size="1">
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Assignments
            </Text>
            <Text size="5" weight="bold">
              {candidateCases.length}
            </Text>
            <Text size="1" color="gray">
              All non-archived cases linked to your account.
            </Text>
          </Flex>
        </Card>
        <Card variant="surface" size="1">
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Repositories ready
            </Text>
            <Text size="5" weight="bold">
              {repositoryCount}
            </Text>
            <Text size="1" color="gray">
              Assignments with a working Gitea repository link.
            </Text>
          </Flex>
        </Card>
        <Card variant="surface" size="1">
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Active work
            </Text>
            <Text size="5" weight="bold">
              {activeCount}
            </Text>
            <Text size="1" color="gray">
              Cases still ready, in progress, or under review.
            </Text>
          </Flex>
        </Card>
        <Card variant="surface" size="1">
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Final decisions
            </Text>
            <Text size="5" weight="bold">
              {decidedCount}
            </Text>
            <Text size="1" color="gray">
              Cases that already have a recorded decision.
            </Text>
          </Flex>
        </Card>
      </Grid>

      <Grid
        columns={{
          initial: "1fr",
          lg: "minmax(0, 1.45fr) minmax(280px, 0.55fr)",
        }}
        gap="4"
      >
        <SectionCard
          title="Assigned cases"
          description="Repository links, due dates, and review signals for every case currently linked to your account."
          eyebrow="Candidate workspace"
        >
          {candidateCases.length === 0 ? (
            <Text as="p" size="2" color="gray">
              No candidate cases are assigned to your account yet. Your hiring
              team will provision a repository here once the next assessment is
              ready.
            </Text>
          ) : (
            <Grid
              columns={{ initial: "1fr", xl: "repeat(2, minmax(0, 1fr))" }}
              gap="3"
            >
              {candidateCases.map((candidateCase) => (
                <Card key={candidateCase.id} variant="surface" size="2">
                  <Flex direction="column" gap="3">
                    <Flex justify="between" align="start" gap="3">
                      <Flex direction="column" gap="1">
                        <Text weight="bold">{candidateCase.templateName}</Text>
                        <Text size="1" color="gray">
                          Slug: {candidateCase.templateSlug}
                        </Text>
                      </Flex>
                      <StatusBadge
                        label={candidateCase.status
                          .toLowerCase()
                          .replace(/_/g, " ")}
                        tone={statusToneMap[candidateCase.status]}
                      />
                    </Flex>

                    <Text size="2" color="gray">
                      {candidateCase.templateSummary}
                    </Text>

                    <Flex gap="2" wrap="wrap">
                      {candidateCase.decision ? (
                        <StatusBadge
                          label={candidateCase.decision.toLowerCase()}
                          tone={decisionToneMap[candidateCase.decision]}
                        />
                      ) : (
                        <StatusBadge label="Awaiting decision" tone="neutral" />
                      )}
                      <StatusBadge
                        label={
                          candidateCase.notesCount > 0
                            ? `${candidateCase.notesCount} review notes`
                            : "No review notes yet"
                        }
                        tone={candidateCase.notesCount > 0 ? "info" : "neutral"}
                      />
                    </Flex>

                    <Flex direction="column" gap="1">
                      {candidateCase.workingRepositoryUrl ? (
                        <RadixLink
                          href={candidateCase.workingRepositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          size="2"
                        >
                          {candidateCase.workingRepository ?? "Open repository"}
                        </RadixLink>
                      ) : (
                        <Text weight="bold">Repository pending</Text>
                      )}
                      <Text size="1" color="gray">
                        Branch: {candidateCase.branchName ?? "Not set"}
                      </Text>
                      <Text size="1" color="gray">
                        Due:{" "}
                        {candidateCase.dueAt
                          ? dateFormatter.format(candidateCase.dueAt)
                          : "No due date"}
                      </Text>
                      <Text size="1" color="gray">
                        Assigned:{" "}
                        {dateFormatter.format(candidateCase.createdAt)}
                      </Text>
                      <Text size="1" color="gray">
                        Started:{" "}
                        {candidateCase.startedAt
                          ? dateFormatter.format(candidateCase.startedAt)
                          : "No repository activity yet"}
                      </Text>
                      <Text size="1" color="gray">
                        Submitted:{" "}
                        {candidateCase.submittedAt
                          ? dateFormatter.format(candidateCase.submittedAt)
                          : "No submission signal yet"}
                      </Text>
                      <Text size="1" color="gray">
                        Last sync:{" "}
                        {candidateCase.lastSyncedAt
                          ? dateFormatter.format(candidateCase.lastSyncedAt)
                          : "No webhook delivery yet"}
                      </Text>
                      <Text size="1" color="gray">
                        Assigned by: {candidateCase.createdByName}
                      </Text>
                    </Flex>

                    <Flex direction="column" gap="1">
                      {typeof candidateCase.latestScore === "number" ? (
                        <Text weight="bold">
                          Latest score: {candidateCase.latestScore}/10
                        </Text>
                      ) : (
                        <Text weight="bold">
                          Latest score: Not recorded yet
                        </Text>
                      )}
                      <Text size="1" color="gray">
                        {candidateCase.latestSummary ??
                          "No review summary has been shared in the workspace yet."}
                      </Text>
                      <Text size="1" color="gray">
                        Reviewer:{" "}
                        {candidateCase.latestReviewerName ??
                          "Awaiting first review"}
                      </Text>
                      <Text size="1" color="gray">
                        Last note:{" "}
                        {candidateCase.latestReviewedAt
                          ? dateFormatter.format(candidateCase.latestReviewedAt)
                          : "No notes yet"}
                      </Text>
                      <Text size="1" color="gray">
                        Finalized:{" "}
                        {candidateCase.reviewedAt
                          ? dateFormatter.format(candidateCase.reviewedAt)
                          : "Not completed"}
                      </Text>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Grid>
          )}
        </SectionCard>

        <Flex direction="column" gap="4">
          <SectionCard
            title="How to read this view"
            description="The workspace tracks assignment and review state, while repository activity still depends on internal sync work."
            eyebrow="Current model"
          >
            <ol
              style={{
                margin: 0,
                paddingLeft: "1.1rem",
                display: "grid",
                gap: "0.75rem",
              }}
            >
              <li>
                <Text color="gray">
                  Use the repository link above as the primary place to work on
                  the assignment.
                </Text>
              </li>
              <li>
                <Text color="gray">
                  Review notes and scores appear here after your hiring team
                  records them in the workspace.
                </Text>
              </li>
              <li>
                <Text color="gray">
                  A final decision only appears after the review is explicitly
                  finalized internally.
                </Text>
              </li>
            </ol>
          </SectionCard>

          <SectionCard
            title="Current totals"
            description="A quick read on how much of your current workload is still active."
            eyebrow="Snapshot"
          >
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                Completed reviews: {completedCount}
              </Text>
              <Text size="2" color="gray">
                Cases with final decisions: {decidedCount}
              </Text>
              <Text size="2" color="gray">
                Cases still active: {activeCount}
              </Text>
              <Text size="2" color="gray">
                Repositories already provisioned: {repositoryCount}
              </Text>
            </Flex>
          </SectionCard>
        </Flex>
      </Grid>
    </Flex>
  );
}
