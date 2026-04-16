import {
  type CandidateCaseDecision,
  type CandidateCaseStatus,
  UserRole,
} from "@prisma/client";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Callout,
  Code,
  Flex,
  Grid,
  Link as RadixLink,
  Separator,
  Text,
} from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateCaseActions } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-actions";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/session";
import {
  getCandidateCaseAssignmentOptions,
  getCandidateCaseById,
  listCandidateCases,
} from "@/lib/candidate-cases/queries";

type CandidateCaseDetailPageProps = {
  params: Promise<{
    candidateCaseId: string;
  }>;
};

const statusToneMap: Record<
  CandidateCaseStatus,
  "info" | "neutral" | "positive" | "warning"
> = {
  DRAFT: "neutral",
  PROVISIONING: "info",
  READY: "positive",
  IN_PROGRESS: "info",
  REVIEWING: "warning",
  COMPLETED: "positive",
  ARCHIVED: "neutral",
};

const decisionToneMap: Record<
  CandidateCaseDecision,
  "neutral" | "positive" | "warning"
> = {
  ADVANCE: "positive",
  HOLD: "neutral",
  REJECT: "warning",
};

const reviewWorkflowEligibleStatuses = new Set<CandidateCaseStatus>([
  "READY",
  "IN_PROGRESS",
  "REVIEWING",
  "COMPLETED",
]);

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "Not available yet";
}

function formatAuditDetail(detail: unknown) {
  if (!detail) {
    return "No additional detail";
  }

  return JSON.stringify(detail, null, 2);
}

export default async function CandidateCaseDetailPage({
  params,
}: CandidateCaseDetailPageProps) {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const { candidateCaseId } = await params;

  const [candidateCase, candidateCases, assignmentOptions] = await Promise.all([
    getCandidateCaseById(candidateCaseId),
    listCandidateCases({ includeArchived: true }),
    getCandidateCaseAssignmentOptions(),
  ]);

  if (!candidateCase) {
    notFound();
  }

  const currentIndex = candidateCases.findIndex(
    (item) => item.id === candidateCase.id,
  );
  const previousCandidateCase =
    currentIndex > 0 ? candidateCases[currentIndex - 1] : null;
  const nextCandidateCase =
    currentIndex >= 0 && currentIndex < candidateCases.length - 1
      ? candidateCases[currentIndex + 1]
      : null;
  const currentPosition = currentIndex >= 0 ? currentIndex + 1 : null;
  const canOpenReviewWorkflow = reviewWorkflowEligibleStatuses.has(
    candidateCase.status,
  );

  return (
    <Grid
      columns={{ initial: "1fr", xl: "minmax(0, 1fr) 360px" }}
      gap="4"
      align="start"
    >
      <Flex direction="column" gap="4">
        <SectionCard
          title="Candidate case workspace"
          description="Track operational state, repository signals, reviewer ownership, and the full assignment history for this case."
          eyebrow="Case detail"
        >
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center" wrap="wrap" gap="3">
              <Flex gap="2" wrap="wrap">
                <Button asChild variant="soft" color="gray" size="2">
                  <Link href={"/dashboard/candidate-cases" as Route}>
                    <ArrowLeftIcon />
                    Back to cases
                  </Link>
                </Button>
                {previousCandidateCase ? (
                  <Button asChild variant="soft" size="2">
                    <Link
                      href={
                        `/dashboard/candidate-cases/${previousCandidateCase.id}` as Route
                      }
                    >
                      Previous case
                    </Link>
                  </Button>
                ) : (
                  <Button variant="soft" size="2" disabled>
                    Previous case
                  </Button>
                )}
                {nextCandidateCase ? (
                  <Button asChild variant="soft" size="2">
                    <Link
                      href={
                        `/dashboard/candidate-cases/${nextCandidateCase.id}` as Route
                      }
                    >
                      Next case
                    </Link>
                  </Button>
                ) : (
                  <Button variant="soft" size="2" disabled>
                    Next case
                  </Button>
                )}
              </Flex>

              <Flex gap="2" wrap="wrap" align="center" justify="end">
                {currentPosition ? (
                  <Text size="1" color="gray">
                    Case {currentPosition} of {candidateCases.length}
                  </Text>
                ) : null}
                <StatusBadge
                  label={candidateCase.status.toLowerCase().replace(/_/g, " ")}
                  tone={statusToneMap[candidateCase.status]}
                />
                {candidateCase.decision ? (
                  <StatusBadge
                    label={candidateCase.decision.toLowerCase()}
                    tone={decisionToneMap[candidateCase.decision]}
                  />
                ) : null}
              </Flex>
            </Flex>

            <Flex
              justify="between"
              align={{ initial: "start", md: "center" }}
              gap="3"
              wrap="wrap"
            >
              <Flex direction="column" gap="1">
                <Text weight="bold" size="4">
                  {candidateCase.candidateDisplayName}
                </Text>
                <Text size="2" color="gray">
                  {candidateCase.templateName} · {candidateCase.templateSlug}
                </Text>
                <Text size="1" color="gray">
                  {candidateCase.candidateEmail}
                </Text>
                <Text size="1" color="gray">
                  Candidate login:{" "}
                  {candidateCase.candidateLogin ?? "Not linked"}
                </Text>
              </Flex>

              <Flex gap="2" wrap="wrap" justify="end">
                {canOpenReviewWorkflow ? (
                  <Button asChild variant="soft" size="2">
                    <Link
                      href={`/dashboard/reviews/${candidateCase.id}` as Route}
                    >
                      Open review workflow
                    </Link>
                  </Button>
                ) : null}
                {candidateCase.workingRepositoryUrl ? (
                  <Button asChild size="2">
                    <a
                      href={candidateCase.workingRepositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open repository
                      <ExternalLinkIcon />
                    </a>
                  </Button>
                ) : null}
                <CandidateCaseActions
                  candidateCase={candidateCase}
                  assignmentOptions={assignmentOptions}
                />
              </Flex>
            </Flex>

            <Text size="2" color="gray">
              {candidateCase.templateSummary}
            </Text>
          </Flex>
        </SectionCard>

        <SectionCard
          title="Repository activity"
          description="Recent commit, pull request, and webhook signals from the generated candidate repository."
          eyebrow="Workstream"
        >
          <Flex direction="column" gap="4">
            <Flex wrap="wrap" gap="3">
              <Text size="2" color="gray">
                Repository: {candidateCase.workingRepository ?? "Pending"}
              </Text>
              <Text size="2" color="gray">
                Branch:{" "}
                {candidateCase.branchName ??
                  candidateCase.templateDefaultBranch}
              </Text>
              <Text size="2" color="gray">
                Started: {formatDate(candidateCase.startedAt)}
              </Text>
              <Text size="2" color="gray">
                Submitted: {formatDate(candidateCase.submittedAt)}
              </Text>
              <Text size="2" color="gray">
                Last sync: {formatDate(candidateCase.lastSyncedAt)}
              </Text>
            </Flex>

            {!candidateCase.workingRepository ? (
              <Text as="p" size="2" color="gray">
                Repository activity will appear here after the candidate
                repository is provisioned.
              </Text>
            ) : (
              <>
                {candidateCase.repositoryActivity.error ? (
                  <Callout.Root color="amber" size="1">
                    <Callout.Text>
                      Repository activity is partially unavailable:{" "}
                      {candidateCase.repositoryActivity.error}
                    </Callout.Text>
                  </Callout.Root>
                ) : null}

                <Grid columns={{ initial: "1fr", lg: "1fr 1fr" }} gap="4">
                  <Flex direction="column" gap="3">
                    <Text weight="bold">Recent commits</Text>
                    {candidateCase.repositoryActivity.commits.length === 0 ? (
                      <Text size="2" color="gray">
                        No commit activity has been observed yet.
                      </Text>
                    ) : (
                      candidateCase.repositoryActivity.commits.map(
                        (commit, index) => (
                          <Flex direction="column" gap="1" key={commit.sha}>
                            {index > 0 ? <Separator size="4" /> : null}
                            <Flex
                              justify="between"
                              align={{ initial: "start", sm: "center" }}
                              gap="2"
                              wrap="wrap"
                            >
                              {commit.url ? (
                                <RadixLink
                                  href={commit.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {commit.message}
                                </RadixLink>
                              ) : (
                                <Text weight="medium">{commit.message}</Text>
                              )}
                              <Code size="1">{commit.sha.slice(0, 7)}</Code>
                            </Flex>
                            <Text size="1" color="gray">
                              {commit.authorName ??
                                commit.authorLogin ??
                                "Unknown author"}{" "}
                              · {formatDate(commit.authoredAt)}
                            </Text>
                          </Flex>
                        ),
                      )
                    )}
                  </Flex>

                  <Flex direction="column" gap="3">
                    <Text weight="bold">Pull requests</Text>
                    {candidateCase.repositoryActivity.pullRequests.length ===
                    0 ? (
                      <Text size="2" color="gray">
                        No pull request activity has been observed yet.
                      </Text>
                    ) : (
                      candidateCase.repositoryActivity.pullRequests.map(
                        (pullRequest, index) => (
                          <Flex
                            direction="column"
                            gap="1"
                            key={pullRequest.number}
                          >
                            {index > 0 ? <Separator size="4" /> : null}
                            <Flex
                              justify="between"
                              align={{ initial: "start", sm: "center" }}
                              gap="2"
                              wrap="wrap"
                            >
                              {pullRequest.url ? (
                                <RadixLink
                                  href={pullRequest.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  #{pullRequest.number} {pullRequest.title}
                                </RadixLink>
                              ) : (
                                <Text weight="medium">
                                  #{pullRequest.number} {pullRequest.title}
                                </Text>
                              )}
                              <StatusBadge
                                label={
                                  pullRequest.isDraft
                                    ? `${pullRequest.state} draft`
                                    : pullRequest.state
                                }
                                tone={
                                  pullRequest.isMerged
                                    ? "positive"
                                    : pullRequest.state === "open"
                                      ? "info"
                                      : "neutral"
                                }
                              />
                            </Flex>
                            <Text size="1" color="gray">
                              {pullRequest.authorName ?? "Unknown author"} ·
                              Updated {formatDate(pullRequest.updatedAt)}
                            </Text>
                          </Flex>
                        ),
                      )
                    )}
                  </Flex>
                </Grid>

                <Separator size="4" />

                <Flex direction="column" gap="3">
                  <Text weight="bold">Webhook deliveries</Text>
                  {candidateCase.webhookDeliveries.length === 0 ? (
                    <Text size="2" color="gray">
                      No webhook deliveries have been recorded for this
                      repository yet.
                    </Text>
                  ) : (
                    <Grid columns={{ initial: "1fr", lg: "1fr 1fr" }} gap="3">
                      {candidateCase.webhookDeliveries.map((delivery) => (
                        <Box
                          key={delivery.id}
                          style={{
                            border: "1px solid var(--gray-a5)",
                            borderRadius: "var(--radius-3)",
                            padding: "0.9rem",
                          }}
                        >
                          <Flex direction="column" gap="1">
                            <Flex justify="between" gap="2" wrap="wrap">
                              <Text weight="bold">{delivery.eventName}</Text>
                              <StatusBadge
                                label={
                                  delivery.statusCode
                                    ? `HTTP ${delivery.statusCode}`
                                    : "Pending"
                                }
                                tone={
                                  delivery.errorMessage
                                    ? "warning"
                                    : delivery.statusCode &&
                                        delivery.statusCode >= 400
                                      ? "warning"
                                      : "info"
                                }
                              />
                            </Flex>
                            <Text size="1" color="gray">
                              Action: {delivery.action ?? "N/A"}
                            </Text>
                            <Text size="1" color="gray">
                              Branch: {delivery.branchName ?? "N/A"}
                            </Text>
                            <Text size="1" color="gray">
                              Processed: {formatDate(delivery.processedAt)}
                            </Text>
                            <Text size="1" color="gray">
                              Received: {formatDate(delivery.createdAt)}
                            </Text>
                            {delivery.errorMessage ? (
                              <Text size="1" color="red">
                                {delivery.errorMessage}
                              </Text>
                            ) : null}
                          </Flex>
                        </Box>
                      ))}
                    </Grid>
                  )}
                </Flex>
              </>
            )}
          </Flex>
        </SectionCard>

        <SectionCard
          title="Review history"
          description="All reviewer notes, summaries, and scoring captured against this case so far."
          eyebrow="Evaluation"
        >
          {candidateCase.reviewHistory.length === 0 ? (
            <Text as="p" size="2" color="gray">
              No review notes have been recorded for this case yet.
            </Text>
          ) : (
            <Flex direction="column" gap="3">
              {candidateCase.reviewHistory.map((historyItem, index) => (
                <Flex direction="column" gap="2" key={historyItem.id}>
                  {index > 0 ? <Separator size="4" /> : null}
                  <Flex
                    justify="between"
                    align={{ initial: "start", sm: "center" }}
                    gap="3"
                    wrap="wrap"
                  >
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="bold">
                        {historyItem.authorName}
                      </Text>
                      <Text size="1" color="gray">
                        Created: {formatDate(historyItem.createdAt)}
                      </Text>
                      <Text size="1" color="gray">
                        Updated: {formatDate(historyItem.updatedAt)}
                      </Text>
                    </Flex>
                    <Text size="2" weight="medium">
                      {typeof historyItem.score === "number"
                        ? `Score ${historyItem.score}/10`
                        : "No score"}
                    </Text>
                  </Flex>
                  <Text size="2" weight="medium">
                    {historyItem.summary}
                  </Text>
                  <Text size="1" color="gray">
                    {historyItem.note ?? "No detailed note provided."}
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}
        </SectionCard>

        <SectionCard
          title="Audit trail"
          description="Internal operations and sync events recorded for this case and its repository."
          eyebrow="History"
        >
          {candidateCase.auditLogs.length === 0 ? (
            <Text as="p" size="2" color="gray">
              No audit events have been recorded for this case yet.
            </Text>
          ) : (
            <Box
              style={{
                maxHeight: "70vh",
                overflowY: "auto",
                display: "grid",
                gap: "0.9rem",
              }}
            >
              {candidateCase.auditLogs.map((auditLog) => (
                <Box
                  key={auditLog.id}
                  style={{
                    border: "1px solid var(--gray-a5)",
                    borderRadius: "var(--radius-3)",
                    padding: "0.9rem",
                  }}
                >
                  <Flex direction="column" gap="2">
                    <Flex justify="between" gap="3" wrap="wrap">
                      <StatusBadge label={auditLog.action} tone="info" />
                      <Text size="1" color="gray">
                        {formatDate(auditLog.createdAt)}
                      </Text>
                    </Flex>
                    <Text size="1" color="gray">
                      Actor:{" "}
                      {auditLog.actor?.name ??
                        auditLog.actor?.email ??
                        "System"}
                    </Text>
                    <Text size="1" color="gray">
                      Resource: {auditLog.resourceType}
                      {auditLog.resourceId ? ` · ${auditLog.resourceId}` : ""}
                    </Text>
                    <Code
                      size="1"
                      style={{
                        display: "block",
                        maxHeight: "12rem",
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {formatAuditDetail(auditLog.detail)}
                    </Code>
                  </Flex>
                </Box>
              ))}
            </Box>
          )}
        </SectionCard>
      </Flex>

      <Flex direction="column" gap="4">
        <SectionCard
          title="Case context"
          description="Keep the full assignment context visible while you inspect repository and review activity."
          eyebrow="Summary"
        >
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Candidate
              </Text>
              <Text size="2">{candidateCase.candidateDisplayName}</Text>
              <Text size="1" color="gray">
                {candidateCase.candidateEmail}
              </Text>
              <Text size="1" color="gray">
                Gitea login: {candidateCase.candidateLogin ?? "Not linked"}
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Assignment
              </Text>
              <Text size="1" color="gray">
                Created: {formatDate(candidateCase.createdAt)}
              </Text>
              <Text size="1" color="gray">
                Due: {formatDate(candidateCase.dueAt)}
              </Text>
              <Text size="1" color="gray">
                Reviewed: {formatDate(candidateCase.reviewedAt)}
              </Text>
              <Text size="1" color="gray">
                Owner: {candidateCase.createdByName}
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Reviewer assignment
              </Text>
              <Text size="1" color="gray">
                {candidateCase.reviewerDisplayNames.length > 0
                  ? candidateCase.reviewerDisplayNames.join(", ")
                  : "No reviewers assigned"}
              </Text>
              <Text size="1" color="gray">
                Notes recorded: {candidateCase.notesCount}
              </Text>
              <Text size="1" color="gray">
                Latest reviewer:{" "}
                {candidateCase.latestReviewerName ?? "Not reviewed"}
              </Text>
              <Text size="1" color="gray">
                Latest score:{" "}
                {typeof candidateCase.latestScore === "number"
                  ? `${candidateCase.latestScore}/10`
                  : "No score yet"}
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Access grants
              </Text>
              {candidateCase.accessGrants.length === 0 ? (
                <Text size="1" color="gray">
                  No access grants recorded yet.
                </Text>
              ) : (
                candidateCase.accessGrants.map((grant) => (
                  <Box
                    key={grant.id}
                    style={{
                      border: "1px solid var(--gray-a5)",
                      borderRadius: "var(--radius-2)",
                      padding: "0.75rem",
                    }}
                  >
                    <Flex direction="column" gap="1">
                      <Flex justify="between" gap="2" wrap="wrap">
                        <Text size="2" weight="medium">
                          {grant.permissionKey}
                        </Text>
                        <StatusBadge
                          label={grant.revokedAt ? "revoked" : "active"}
                          tone={grant.revokedAt ? "neutral" : "positive"}
                        />
                      </Flex>
                      <Text size="1" color="gray">
                        {grant.repositoryName}
                      </Text>
                      <Text size="1" color="gray">
                        Read {grant.canRead ? "yes" : "no"} · Write{" "}
                        {grant.canWrite ? "yes" : "no"} · PR{" "}
                        {grant.canOpenPullRequests ? "yes" : "no"} · Issues{" "}
                        {grant.canOpenIssues ? "yes" : "no"}
                      </Text>
                      <Text size="1" color="gray">
                        Granted: {formatDate(grant.grantedAt)}
                      </Text>
                      <Text size="1" color="gray">
                        Revoked: {formatDate(grant.revokedAt)}
                      </Text>
                    </Flex>
                  </Box>
                ))
              )}
            </Flex>
          </Flex>
        </SectionCard>

        <SectionCard
          title="Template guide"
          description="The review guidance and rubric defaults inherited from the selected case template."
          eyebrow="Reference"
        >
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Template repository
              </Text>
              <Text size="1" color="gray">
                {candidateCase.templateRepositoryName}
              </Text>
              <Text size="1" color="gray">
                Default branch: {candidateCase.templateDefaultBranch}
              </Text>
              <Text size="1" color="gray">
                {candidateCase.templateRepositoryDescription ??
                  "No repository description provided."}
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Reviewer instructions
              </Text>
              <Text size="1" color="gray">
                {candidateCase.templateReviewerInstructions ??
                  "No reviewer instructions configured."}
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Decision guidance
              </Text>
              <Text size="1" color="gray">
                {candidateCase.templateDecisionGuidance ??
                  "No decision guidance configured."}
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Rubric criteria
              </Text>
              {candidateCase.rubricCriteria.length === 0 ? (
                <Text size="1" color="gray">
                  No rubric criteria configured for this template.
                </Text>
              ) : (
                candidateCase.rubricCriteria.map((criterion) => (
                  <Box
                    key={criterion.id}
                    style={{
                      border: "1px solid var(--gray-a5)",
                      borderRadius: "var(--radius-2)",
                      padding: "0.75rem",
                    }}
                  >
                    <Flex direction="column" gap="1">
                      <Flex justify="between" gap="2" wrap="wrap">
                        <Text size="2" weight="medium">
                          {criterion.title}
                        </Text>
                        <Text size="1" color="gray">
                          Weight {criterion.weight ?? "N/A"}
                        </Text>
                      </Flex>
                      <Text size="1" color="gray">
                        {criterion.description ??
                          "No criterion description provided."}
                      </Text>
                    </Flex>
                  </Box>
                ))
              )}
            </Flex>

            {candidateCase.latestSummary ? (
              <Callout.Root color="gray" size="1">
                <Callout.Text>
                  Latest review summary: {candidateCase.latestSummary}
                </Callout.Text>
              </Callout.Root>
            ) : null}
          </Flex>
        </SectionCard>

        <SectionCard
          title="Quick links"
          description="Jump straight into the operational surfaces tied to this candidate case."
          eyebrow="Navigation"
        >
          <Flex direction="column" gap="2">
            <Button asChild variant="soft" size="2">
              <Link href={"/dashboard/candidate-cases" as Route}>
                All candidate cases
              </Link>
            </Button>
            {canOpenReviewWorkflow ? (
              <Button asChild variant="soft" size="2">
                <Link href={`/dashboard/reviews/${candidateCase.id}` as Route}>
                  Review workflow
                </Link>
              </Button>
            ) : null}
            {candidateCase.workingRepositoryUrl ? (
              <Button asChild variant="soft" size="2">
                <a
                  href={candidateCase.workingRepositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileTextIcon />
                  Repository in Gitea
                </a>
              </Button>
            ) : null}
          </Flex>
        </SectionCard>
      </Flex>
    </Grid>
  );
}
