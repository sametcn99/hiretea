"use client";

import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { signIn } from "next-auth/react";
import { startTransition, useState } from "react";
import { AppLogo } from "@/components/ui/app-logo";
import { StatusBadge } from "@/components/ui/status-badge";

type SignInPanelProps = {
  isConfigured: boolean;
};

export function SignInPanel({ isConfigured }: SignInPanelProps) {
  const [isPending, setIsPending] = useState(false);

  const handleSignIn = () => {
    setIsPending(true);

    startTransition(() => {
      void signIn("gitea", { callbackUrl: "/dashboard" }).finally(() => {
        setIsPending(false);
      });
    });
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <AppLogo subtitle="Authenticate against your company Gitea server" />

        <Flex direction="column" gap="3">
          <Box>
            <Text
              size="1"
              weight="bold"
              color="blue"
              style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
            >
              Access control
            </Text>
            <Heading as="h1" size="6" mt="1" style={{ lineHeight: 0.98 }}>
              Sign in with your Gitea identity
            </Heading>
          </Box>
          <Text as="p" size="2" color="gray" style={{ lineHeight: 1.7 }}>
            The platform relies on your self-hosted Gitea instance for
            authentication. Local application roles still control what each
            signed-in user can manage once they enter the workspace.
          </Text>
        </Flex>

        <Card variant="surface" size="2">
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center" gap="3">
              <Text size="2">OAuth configuration</Text>
              <StatusBadge
                label={isConfigured ? "Ready" : "Missing"}
                tone={isConfigured ? "positive" : "warning"}
              />
            </Flex>
            <Flex justify="between" align="center" gap="3">
              <Text size="2">Invitation model</Text>
              <StatusBadge label="Manual for MVP" tone="neutral" />
            </Flex>
          </Flex>
        </Card>

        <Button
          size="3"
          loading={isPending}
          disabled={!isConfigured || isPending}
          onClick={handleSignIn}
          type="button"
          style={{ width: "100%" }}
        >
          Continue with Gitea
        </Button>

        {!isConfigured ? (
          <Text size="2" color="gray">
            Finish the initial bootstrap so the OAuth runtime values are
            available before testing the full authentication flow.
          </Text>
        ) : null}
      </Flex>
    </Card>
  );
}
