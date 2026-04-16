"use client";

import { Button, Callout, Code, Flex, Text } from "@radix-ui/themes";
import { useActionState } from "react";
import {
  type ClaimCandidateInviteActionState,
  claimCandidateInviteAction,
} from "../actions";

type InviteClaimPanelProps = {
  token: string;
  inviteStatus: "PENDING" | "CLAIMED" | "REVOKED" | "EXPIRED";
  passwordAvailable: boolean;
  giteaLoginUrl: string | null;
};

const initialState: ClaimCandidateInviteActionState = {
  status: "idle",
};

export function InviteClaimPanel({
  token,
  inviteStatus,
  passwordAvailable,
  giteaLoginUrl,
}: InviteClaimPanelProps) {
  const [state, formAction] = useActionState(
    claimCandidateInviteAction,
    initialState,
  );

  if (state.status === "success") {
    return (
      <Flex direction="column" gap="3">
        <Callout.Root color="green" size="1">
          <Callout.Text>
            Your access details are ready. Save them now before continuing to
            the sign-in flow.
          </Callout.Text>
        </Callout.Root>

        <Flex direction="column" gap="1">
          <Text size="2" weight="bold">
            Gitea username
          </Text>
          <Code size="3">{state.login}</Code>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="bold">
            Temporary password
          </Text>
          <Code size="3" style={{ wordBreak: "break-all" }}>
            {state.temporaryPassword}
          </Code>
        </Flex>

        <Text size="2" color="gray">
          After the first successful Gitea sign-in, you will be prompted to
          change this password.
        </Text>

        <Button asChild size="3">
          <a
            href={state.signInPath ?? "/sign-in"}
            target="_blank"
            rel="noreferrer"
          >
            Continue to Gitea
          </a>
        </Button>
      </Flex>
    );
  }

  if (inviteStatus !== "PENDING" || !passwordAvailable) {
    return (
      <Flex direction="column" gap="3">
        <Callout.Root
          color={
            inviteStatus === "REVOKED" || inviteStatus === "EXPIRED"
              ? "red"
              : "blue"
          }
          size="1"
        >
          <Callout.Text>
            {inviteStatus === "REVOKED"
              ? "This invite was revoked. Ask the hiring team for a fresh onboarding link."
              : inviteStatus === "EXPIRED"
                ? "This invite expired. Ask the hiring team to send a new onboarding link."
                : "This invite was already used. Continue in Gitea with your existing credentials."}
          </Callout.Text>
        </Callout.Root>

        {giteaLoginUrl ? (
          <Button asChild size="3" variant="soft">
            <a href={giteaLoginUrl} target="_blank" rel="noreferrer">
              Go to Gitea
            </a>
          </Button>
        ) : null}
      </Flex>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <Flex direction="column" gap="3">
        <Callout.Root color="blue" size="1">
          <Callout.Text>
            Reveal your one-time access details, then continue directly to
            Gitea.
          </Callout.Text>
        </Callout.Root>

        {state.status === "error" && state.message ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        <Button type="submit" size="3">
          Reveal access details
        </Button>
      </Flex>
    </form>
  );
}
