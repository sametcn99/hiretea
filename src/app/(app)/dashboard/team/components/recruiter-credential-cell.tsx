import { Flex, Text } from "@radix-ui/themes";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecruiterInviteHistoryItem } from "@/lib/recruiters/queries";

type RecruiterCredentialCellProps = {
  hasLinkedSignIn: boolean;
  inviteStatus: "PENDING" | "CLAIMED" | "REVOKED" | "EXPIRED" | null;
  inviteIssueKind: "INITIAL" | "RESEND" | null;
  inviteSequence: number | null;
  inviteCount: number;
  inviteResendCount: number;
  inviteIssuedByName: string | null;
  inviteExpiresAt: Date | null;
  inviteCreatedAt: Date | null;
  inviteClaimedAt: Date | null;
  inviteRevokedAt: Date | null;
  inviteHistory: RecruiterInviteHistoryItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const inviteToneMap: Record<
  NonNullable<RecruiterCredentialCellProps["inviteStatus"]>,
  "info" | "neutral" | "positive" | "warning"
> = {
  PENDING: "info",
  CLAIMED: "positive",
  REVOKED: "neutral",
  EXPIRED: "warning",
};

const inviteLabelMap: Record<
  NonNullable<RecruiterCredentialCellProps["inviteStatus"]>,
  string
> = {
  PENDING: "Invite ready",
  CLAIMED: "Invite opened",
  REVOKED: "Invite revoked",
  EXPIRED: "Invite expired",
};

function formatInviteHistoryLabel(invite: RecruiterInviteHistoryItem) {
  return `#${invite.resendSequence} ${invite.status.toLowerCase()}`;
}

export function RecruiterCredentialCell({
  hasLinkedSignIn,
  inviteStatus,
  inviteIssueKind,
  inviteSequence,
  inviteCount,
  inviteResendCount,
  inviteIssuedByName,
  inviteExpiresAt,
  inviteCreatedAt,
  inviteClaimedAt,
  inviteRevokedAt,
  inviteHistory,
}: RecruiterCredentialCellProps) {
  if (hasLinkedSignIn) {
    return (
      <Flex direction="column" gap="1">
        <StatusBadge label="Onboarding completed" tone="positive" />
        <Text size="1" color="gray">
          This team member already signed in through Gitea.
        </Text>
        {inviteCount > 0 ? (
          <Text size="1" color="gray">
            Invite history retained: {inviteCount} send
            {inviteCount === 1 ? "" : "s"}.
          </Text>
        ) : null}
      </Flex>
    );
  }

  if (!inviteStatus) {
    return (
      <Flex direction="column" gap="1">
        <StatusBadge label="No invite yet" tone="neutral" />
        <Text size="1" color="gray">
          Generate the first onboarding invite from the actions menu.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Flex gap="1" wrap="wrap">
        <StatusBadge
          label={inviteLabelMap[inviteStatus]}
          tone={inviteToneMap[inviteStatus]}
        />
        {inviteSequence ? (
          <StatusBadge label={`Send #${inviteSequence}`} tone="neutral" />
        ) : null}
        {inviteResendCount > 0 ? (
          <StatusBadge
            label={`${inviteResendCount} resend${inviteResendCount === 1 ? "" : "s"}`}
            tone="neutral"
          />
        ) : null}
      </Flex>

      <Text size="1" color="gray">
        {inviteIssueKind === "RESEND" ? "Latest resend" : "Initial invite"}
        {inviteCreatedAt
          ? ` was created ${dateFormatter.format(inviteCreatedAt)}`
          : " is ready"}
        {inviteIssuedByName ? ` by ${inviteIssuedByName}` : ""}.
      </Text>

      {inviteStatus === "PENDING" ? (
        <Text size="1" color="gray">
          Expires:{" "}
          {inviteExpiresAt ? dateFormatter.format(inviteExpiresAt) : "Not set"}
        </Text>
      ) : null}

      {inviteStatus === "CLAIMED" ? (
        <Text size="1" color="gray">
          Access details were revealed
          {inviteClaimedAt
            ? ` on ${dateFormatter.format(inviteClaimedAt)}`
            : " to the team member"}
          .
        </Text>
      ) : null}

      {inviteStatus === "EXPIRED" ? (
        <Text size="1" color="gray">
          Expired:{" "}
          {inviteExpiresAt ? dateFormatter.format(inviteExpiresAt) : "Unknown"}
        </Text>
      ) : null}

      {inviteStatus === "REVOKED" ? (
        <Text size="1" color="gray">
          Revoked:{" "}
          {inviteRevokedAt ? dateFormatter.format(inviteRevokedAt) : "Unknown"}
        </Text>
      ) : null}

      {inviteHistory.length > 1 ? (
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">
            Recent invite history
          </Text>
          <Flex gap="1" wrap="wrap">
            {inviteHistory.slice(1, 4).map((invite) => (
              <StatusBadge
                key={invite.id}
                label={formatInviteHistoryLabel(invite)}
                tone={inviteToneMap[invite.status]}
              />
            ))}
            {inviteHistory.length > 4 ? (
              <StatusBadge
                label={`+${inviteHistory.length - 4} more`}
                tone="neutral"
              />
            ) : null}
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  );
}
