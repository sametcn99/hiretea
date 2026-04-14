import { Flex, Table, Text } from "@radix-ui/themes";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateListItem } from "@/lib/candidates/queries";
import { CandidateActions } from "./candidate-actions";

type CandidateTableProps = {
  candidates: CandidateListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CandidateTable({ candidates }: CandidateTableProps) {
  if (candidates.length === 0) {
    return (
      <Text as="p" size="2" color="gray">
        No candidates are provisioned yet. Start by creating the first candidate
        account from the form on the left.
      </Text>
    );
  }

  return (
    <Table.Root variant="ghost">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Candidate</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Access</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Credentials</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Cases</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {candidates.map((candidate) => (
          <Table.Row key={candidate.id}>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text weight="bold">{candidate.displayName}</Text>
                <Text size="1" color="gray">
                  {candidate.email}
                </Text>
                <Text size="1" color="gray">
                  {candidate.giteaLogin
                    ? `Gitea: ${candidate.giteaLogin}`
                    : "No linked Gitea login"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="2">
                <StatusBadge
                  label={candidate.isActive ? "Active" : "Inactive"}
                  tone={candidate.isActive ? "positive" : "warning"}
                />
                <StatusBadge
                  label={
                    candidate.hasLinkedSignIn
                      ? "Connected"
                      : "Awaiting first sign-in"
                  }
                  tone={candidate.hasLinkedSignIn ? "info" : "neutral"}
                />
              </Flex>
            </Table.Cell>
            <Table.Cell>
              {candidate.hasLinkedSignIn ? (
                <StatusBadge label="Password Changed" tone="positive" />
              ) : (
                <Text size="2" color="gray">
                  <Text weight="bold">Default: </Text>
                  {candidate.initialPassword || "Not stored"}
                </Text>
              )}
            </Table.Cell>
            <Table.Cell>{candidate.caseCount}</Table.Cell>
            <Table.Cell>{dateFormatter.format(candidate.createdAt)}</Table.Cell>
            <Table.Cell>
              <CandidateActions
                candidateId={candidate.id}
                candidateName={
                  candidate.displayName || candidate.email || candidate.id
                }
              />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
