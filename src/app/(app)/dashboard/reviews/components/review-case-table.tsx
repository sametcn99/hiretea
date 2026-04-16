import type {
  CandidateCaseDecision,
  CandidateCaseStatus,
} from "@prisma/client";
import { Button, Flex, Link as RadixLink, Table, Text } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ReviewCaseListItem } from "@/lib/evaluation-notes/queries";

type ReviewCaseTableProps = {
  reviewCases: ReviewCaseListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

export function ReviewCaseTable({ reviewCases }: ReviewCaseTableProps) {
  if (reviewCases.length === 0) {
    return (
      <Text as="p" size="2" color="gray">
        No reviewable candidate cases exist yet. Assign a candidate case before
        recording reviewer notes.
      </Text>
    );
  }

  return (
    <Table.Root variant="ghost">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Candidate case</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Repository</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Review state</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Latest note</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Dates</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {reviewCases.map((reviewCase) => (
          <Table.Row key={reviewCase.id}>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text weight="bold">{reviewCase.candidateDisplayName}</Text>
                <Text size="1" color="gray">
                  {reviewCase.candidateEmail}
                </Text>
                <Text size="1" color="gray">
                  {reviewCase.templateName}
                </Text>
                <Text size="1" color="gray">
                  Slug: {reviewCase.templateSlug}
                </Text>
                <Text size="1" color="gray">
                  {reviewCase.hasTemplateReviewGuide
                    ? reviewCase.rubricCriteriaCount > 0
                      ? `${reviewCase.rubricCriteriaCount} rubric criteria ready`
                      : "Template review guide ready"
                    : "No template review guide yet"}
                </Text>
                <Text size="1" color="gray">
                  {reviewCase.assignedReviewerNames.length > 0
                    ? `Assigned reviewers: ${reviewCase.assignedReviewerNames.join(", ")}`
                    : "Assigned reviewers: none"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                {reviewCase.workingRepositoryUrl ? (
                  <RadixLink
                    href={reviewCase.workingRepositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="2"
                  >
                    {reviewCase.workingRepository ?? "Open repository"}
                  </RadixLink>
                ) : (
                  <Text weight="bold">
                    {reviewCase.workingRepository ?? "Pending"}
                  </Text>
                )}
                <Text size="1" color="gray">
                  Candidate login: {reviewCase.candidateLogin ?? "Not linked"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="2">
                <StatusBadge
                  label={reviewCase.status.toLowerCase().replace(/_/g, " ")}
                  tone={statusToneMap[reviewCase.status]}
                />
                {reviewCase.decision ? (
                  <StatusBadge
                    label={reviewCase.decision.toLowerCase()}
                    tone={decisionToneMap[reviewCase.decision]}
                  />
                ) : (
                  <StatusBadge label="No decision yet" tone="neutral" />
                )}
                <Text size="1" color="gray">
                  {reviewCase.notesCount} notes recorded
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                {typeof reviewCase.latestScore === "number" ? (
                  <Text weight="bold">Score: {reviewCase.latestScore}/10</Text>
                ) : (
                  <Text weight="bold">No score yet</Text>
                )}
                <Text size="1" color="gray">
                  {reviewCase.latestSummary ??
                    "No review summary recorded yet."}
                </Text>
                <Text size="1" color="gray">
                  Reviewer: {reviewCase.latestReviewerName ?? "Not reviewed"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Due:{" "}
                  {reviewCase.dueAt
                    ? dateFormatter.format(reviewCase.dueAt)
                    : "No due date"}
                </Text>
                <Text size="1" color="gray">
                  Last review:{" "}
                  {reviewCase.latestReviewedAt
                    ? dateFormatter.format(reviewCase.latestReviewedAt)
                    : "No notes yet"}
                </Text>
                <Text size="1" color="gray">
                  Finalized:{" "}
                  {reviewCase.reviewedAt
                    ? dateFormatter.format(reviewCase.reviewedAt)
                    : "Not completed"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Button asChild size="1" variant="soft">
                <Link href={`/dashboard/reviews/${reviewCase.id}` as Route}>
                  Open workflow
                </Link>
              </Button>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
