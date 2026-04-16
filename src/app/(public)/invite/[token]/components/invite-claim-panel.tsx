"use client";

import { Button, Callout, Code, Flex, Text } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";
import {
  type ClaimCandidateInviteActionState,
  claimCandidateInviteAction,
} from "../actions";

type InviteClaimPanelProps = {
  token: string;
  inviteStatus: "PENDING" | "CLAIMED" | "REVOKED" | "EXPIRED";
  passwordAvailable: boolean;
};

const initialState: ClaimCandidateInviteActionState = {
  status: "idle",
};

export function InviteClaimPanel({
  token,
  inviteStatus,
  passwordAvailable,
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
          <Link href={(state.signInPath ?? "/sign-in") as Route}>
            Continue to sign in
          </Link>
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
                : "This invite was already used. Continue with the sign-in flow using your Gitea credentials."}
          </Callout.Text>
        </Callout.Root>

        <Button asChild size="3" variant="soft">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </Flex>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <Flex direction="column" gap="3">
        <Callout.Root color="blue" size="1">
          <Callout.Text>
            Reveal your one-time access details, then continue to the Gitea
            sign-in flow.
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
