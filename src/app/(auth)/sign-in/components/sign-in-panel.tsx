"use client";

import type { UserRole } from "@prisma/client";
import {
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { startTransition, useState } from "react";
import { AppLogo } from "@/components/ui/app-logo";
import { StatusBadge } from "@/components/ui/status-badge";

type CurrentUserSession = {
  name?: string | null;
  email?: string | null;
  role: UserRole;
  continuePath: Route;
};

type SignInPanelProps = {
  isConfigured: boolean;
  error?: string;
  giteaBaseUrl?: string | null;
  currentUser?: CurrentUserSession;
};

function getCandidateGiteaLoginUrl(giteaBaseUrl?: string | null) {
  return giteaBaseUrl ? `${giteaBaseUrl.replace(/\/$/, "")}/user/login` : null;
}

function getGiteaLogoutUrl(giteaBaseUrl?: string | null) {
  return giteaBaseUrl ? `${giteaBaseUrl.replace(/\/$/, "")}/user/logout` : null;
}

export function SignInPanel({
  isConfigured,
  error,
  giteaBaseUrl,
  currentUser,
}: SignInPanelProps) {
  const [pendingAction, setPendingAction] = useState<
    "sign-in" | "switch-account" | null
  >(null);
  const candidateGiteaLoginUrl = getCandidateGiteaLoginUrl(giteaBaseUrl);
  const giteaLogoutUrl = getGiteaLogoutUrl(giteaBaseUrl);
  const isCandidateAccessDenied = error === "candidate-access-denied";
  const isPending = pendingAction !== null;

  const handleSignIn = () => {
    setPendingAction("sign-in");

    startTransition(() => {
      void signIn("gitea", { callbackUrl: "/dashboard" }).finally(() => {
        setPendingAction(null);
      });
    });
  };

  const handleSwitchAccount = () => {
    setPendingAction("switch-account");

    startTransition(() => {
      void signOut({ redirect: false })
        .then(async () => {
          if (giteaLogoutUrl) {
            await fetch(giteaLogoutUrl, {
              method: "GET",
              mode: "no-cors",
              credentials: "include",
              cache: "no-store",
            }).catch(() => undefined);
          }

          return signIn("gitea", { callbackUrl: "/dashboard" });
        })
        .finally(() => {
          setPendingAction(null);
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

        {currentUser ? (
          <Card variant="surface" size="2">
            <Flex direction="column" gap="3">
              <Box>
                <Text size="2" weight="bold">
                  You are already signed in to Hiretea
                </Text>
                <Text as="p" size="2" color="gray" mt="1">
                  Continue with the current session or sign in with another
                  Gitea account.
                </Text>
              </Box>

              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">
                  {currentUser.name ?? currentUser.email ?? "Current account"}
                </Text>
                {currentUser.name && currentUser.email ? (
                  <Text size="2" color="gray">
                    {currentUser.email}
                  </Text>
                ) : null}
                <Text size="1" color="gray">
                  {currentUser.role}
                </Text>
              </Flex>

              <Flex direction="column" gap="2">
                <Button asChild size="3">
                  <Link href={currentUser.continuePath}>
                    Continue with current account
                  </Link>
                </Button>

                <Button
                  size="3"
                  variant="outline"
                  disabled={!isConfigured || isPending}
                  loading={pendingAction === "switch-account"}
                  onClick={handleSwitchAccount}
                  type="button"
                >
                  Sign in with another account
                </Button>
              </Flex>
            </Flex>
          </Card>
        ) : null}

        {isCandidateAccessDenied ? (
          <Callout.Root color="amber" size="1">
            <Callout.Text>
              Candidate accounts cannot sign in to Hiretea. Candidates should
              use their Gitea account directly for repository work.
            </Callout.Text>
          </Callout.Root>
        ) : null}

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

        {!currentUser ? (
          <Button
            size="3"
            loading={pendingAction === "sign-in"}
            disabled={!isConfigured || isPending}
            onClick={handleSignIn}
            type="button"
            style={{ width: "100%" }}
          >
            Continue with Gitea
          </Button>
        ) : null}

        {isCandidateAccessDenied && candidateGiteaLoginUrl ? (
          <Button asChild size="3" variant="soft" color="gray">
            <a href={candidateGiteaLoginUrl} target="_blank" rel="noreferrer">
              Open Gitea sign in
            </a>
          </Button>
        ) : null}

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
