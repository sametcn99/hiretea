import { Flex, Link as RadixLink, Table, Text } from "@radix-ui/themes";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CandidateCaseAssignmentOptions,
  CandidateCaseListItem,
} from "@/lib/candidate-cases/queries";
import { CandidateCaseActions } from "./candidate-case-actions";

type CandidateCaseTableProps = {
  candidateCases: CandidateCaseListItem[];
  assignmentOptions: CandidateCaseAssignmentOptions;
  showArchived: boolean;
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

export function CandidateCaseTable({
  candidateCases,
  assignmentOptions,
  showArchived,
}: CandidateCaseTableProps) {
  if (candidateCases.length === 0) {
    return (
      <Text as="p" size="2" color="gray">
        {showArchived
          ? "No candidate cases match the current filter."
          : "No candidate cases are assigned yet. Use the form on the left to create the first working repository from a template."}
      </Text>
    );
  }

  return (
    <Table.Root variant="ghost">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Candidate</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Template</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Repository</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Reviewers</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Dates</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {candidateCases.map((candidateCase) => (
          <Table.Row key={candidateCase.id}>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text weight="bold">{candidateCase.candidateDisplayName}</Text>
                <Text size="1" color="gray">
                  {candidateCase.candidateEmail}
                </Text>
                <Text size="1" color="gray">
                  {candidateCase.candidateLogin
                    ? `Gitea: ${candidateCase.candidateLogin}`
                    : "No linked Gitea login"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text weight="bold">{candidateCase.templateName}</Text>
                <Text size="1" color="gray">
                  Slug: {candidateCase.templateSlug}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
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
                  <Text weight="bold">
                    {candidateCase.workingRepository ?? "Pending"}
                  </Text>
                )}
                <Text size="1" color="gray">
                  Branch: {candidateCase.branchName ?? "Not set"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                {candidateCase.reviewerDisplayNames.length > 0 ? (
                  candidateCase.reviewerDisplayNames.map((reviewerName) => (
                    <Text size="1" color="gray" key={reviewerName}>
                      {reviewerName}
                    </Text>
                  ))
                ) : (
                  <Text size="1" color="gray">
                    No reviewers assigned
                  </Text>
                )}
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="2">
                <StatusBadge
                  label={candidateCase.status.toLowerCase().replace(/_/g, " ")}
                  tone={statusToneMap[candidateCase.status]}
                />
                {candidateCase.decision ? (
                  <StatusBadge
                    label={candidateCase.decision.toLowerCase()}
                    tone={decisionToneMap[candidateCase.decision]}
                  />
                ) : (
                  <StatusBadge label="No decision yet" tone="neutral" />
                )}
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Created: {dateFormatter.format(candidateCase.createdAt)}
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
                  Due:{" "}
                  {candidateCase.dueAt
                    ? dateFormatter.format(candidateCase.dueAt)
                    : "No due date"}
                </Text>
                <Text size="1" color="gray">
                  Owner: {candidateCase.createdByName}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <CandidateCaseActions
                candidateCase={candidateCase}
                assignmentOptions={assignmentOptions}
              />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
