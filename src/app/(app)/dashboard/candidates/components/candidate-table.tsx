import { Flex, Table, Text } from "@radix-ui/themes";
import { CandidateCredentialCell } from "@/app/(app)/dashboard/candidates/components/candidate-credential-cell";
import { EmptyState } from "@/components/ui/empty-state";
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
      <EmptyState
        eyebrow="Current roster"
        title="No candidates yet"
        description="Use New candidate to provision the first workspace account and start assigning cases."
      />
    );
  }

  return (
    <Table.Root variant="ghost">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Candidate</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Access</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Onboarding</Table.ColumnHeaderCell>
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
              <CandidateCredentialCell
                hasLinkedSignIn={candidate.hasLinkedSignIn}
                inviteStatus={candidate.inviteStatus}
                inviteIssueKind={candidate.inviteIssueKind}
                inviteSequence={candidate.inviteSequence}
                inviteCount={candidate.inviteCount}
                inviteResendCount={candidate.inviteResendCount}
                inviteIssuedByName={candidate.inviteIssuedByName}
                inviteExpiresAt={candidate.inviteExpiresAt}
                inviteCreatedAt={candidate.inviteCreatedAt}
                inviteClaimedAt={candidate.inviteClaimedAt}
                inviteRevokedAt={candidate.inviteRevokedAt}
                inviteHistory={candidate.inviteHistory}
              />
            </Table.Cell>
            <Table.Cell>{candidate.caseCount}</Table.Cell>
            <Table.Cell>{dateFormatter.format(candidate.createdAt)}</Table.Cell>
            <Table.Cell>
              <CandidateActions
                candidateId={candidate.id}
                candidateName={
                  candidate.displayName || candidate.email || candidate.id
                }
                hasLinkedSignIn={candidate.hasLinkedSignIn}
                inviteStatus={candidate.inviteStatus}
              />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
