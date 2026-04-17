import { UserRole } from "@prisma/client";
import { Flex, Table, Text } from "@radix-ui/themes";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecruiterListItem } from "@/lib/recruiters/queries";
import { RecruiterActions } from "./recruiter-actions";
import { RecruiterCredentialCell } from "./recruiter-credential-cell";

type RecruiterTableProps = {
  recruiters: RecruiterListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function RecruiterTable({ recruiters }: RecruiterTableProps) {
  if (recruiters.length === 0) {
    return (
      <Text as="p" size="2" color="gray">
        No workspace members are available yet. Complete bootstrap or provision
        the first recruiting team member from the form on the left.
      </Text>
    );
  }

  return (
    <Table.Root variant="ghost">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Team member</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Access</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Onboarding</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {recruiters.map((recruiter) => (
          <Table.Row key={recruiter.id}>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text weight="bold">{recruiter.displayName}</Text>
                <Text size="1" color="gray">
                  {recruiter.email}
                </Text>
                <Text size="1" color="gray">
                  {recruiter.giteaLogin
                    ? `Gitea: ${recruiter.giteaLogin}`
                    : recruiter.role === UserRole.ADMIN
                      ? "Bootstrap-created admin account"
                      : "No linked Gitea login"}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="2">
                <StatusBadge
                  label={
                    recruiter.role === UserRole.ADMIN ? "Admin" : "Recruiter"
                  }
                  tone={recruiter.role === UserRole.ADMIN ? "info" : "neutral"}
                />
                <StatusBadge
                  label={recruiter.isActive ? "Active" : "Inactive"}
                  tone={recruiter.isActive ? "positive" : "warning"}
                />
                <StatusBadge
                  label={
                    recruiter.hasLinkedSignIn
                      ? "Connected"
                      : "Awaiting first sign-in"
                  }
                  tone={recruiter.hasLinkedSignIn ? "info" : "neutral"}
                />
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <RecruiterCredentialCell
                role={recruiter.role}
                hasLinkedSignIn={recruiter.hasLinkedSignIn}
                inviteStatus={recruiter.inviteStatus}
                inviteIssueKind={recruiter.inviteIssueKind}
                inviteSequence={recruiter.inviteSequence}
                inviteCount={recruiter.inviteCount}
                inviteResendCount={recruiter.inviteResendCount}
                inviteIssuedByName={recruiter.inviteIssuedByName}
                inviteExpiresAt={recruiter.inviteExpiresAt}
                inviteCreatedAt={recruiter.inviteCreatedAt}
                inviteClaimedAt={recruiter.inviteClaimedAt}
                inviteRevokedAt={recruiter.inviteRevokedAt}
                inviteHistory={recruiter.inviteHistory}
              />
            </Table.Cell>
            <Table.Cell>{dateFormatter.format(recruiter.createdAt)}</Table.Cell>
            <Table.Cell>
              <RecruiterActions
                recruiterId={recruiter.id}
                recruiterName={
                  recruiter.displayName || recruiter.email || recruiter.id
                }
                role={recruiter.role}
                hasLinkedSignIn={recruiter.hasLinkedSignIn}
                inviteStatus={recruiter.inviteStatus}
                isActive={recruiter.isActive}
              />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
