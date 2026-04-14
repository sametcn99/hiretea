import { Box, Container, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SetupForm } from "@/app/(public)/setup/components/setup-form";
import { AppLogo } from "@/components/ui/app-logo";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getServerAuthSession } from "@/lib/auth/session";
import { getBootstrapStatus } from "@/lib/bootstrap/status";
import {
  env,
  hasAuthConfiguration,
  hasGiteaAdminConfiguration,
} from "@/lib/env";

export default async function SetupPage() {
  await connection();

  const bootstrapStatus = await getBootstrapStatus();

  if (!bootstrapStatus.requiresSetup) {
    const session = await getServerAuthSession();

    redirect((session?.user?.id ? "/dashboard" : "/sign-in") as Route);
  }

  const defaults = {
    companyName: env.hiretea_COMPANY_NAME ?? "Hiretea Workspace",
    giteaBaseUrl: env.AUTH_GITEA_ISSUER ?? env.GITEA_ADMIN_BASE_URL ?? "",
    giteaOrganization: env.GITEA_ORGANIZATION_NAME ?? "",
    defaultBranch: env.hiretea_DEFAULT_BRANCH ?? "main",
  };

  return (
    <Container size="3" py="7">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="4">
          <AppLogo subtitle="First-run workspace bootstrap" />
          <Box>
            <Text
              size="1"
              weight="bold"
              color="blue"
              style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
            >
              Workspace setup
            </Text>
            <Heading as="h1" size="7" mt="1">
              Initialize the first internal admin
            </Heading>
          </Box>
          <Text
            as="p"
            size="3"
            color="gray"
            style={{ maxWidth: "58ch", lineHeight: 1.75 }}
          >
            This one-time flow seeds the first admin user and writes the initial
            workspace settings. After setup completes, all access continues
            through your self-hosted Gitea OAuth login.
          </Text>
        </Flex>

        <Grid columns={{ initial: "1fr", md: "1fr 1fr" }} gap="5">
          <Flex direction="column" gap="5">
            <SectionCard
              title="Readiness checks"
              description="The first setup depends on both environment configuration and the bootstrap token."
              eyebrow="Before you submit"
            >
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center" gap="3">
                  <Text size="2">Gitea OAuth variables</Text>
                  <StatusBadge
                    label={hasAuthConfiguration() ? "Ready" : "Missing"}
                    tone={hasAuthConfiguration() ? "positive" : "warning"}
                  />
                </Flex>
                <Flex justify="between" align="center" gap="3">
                  <Text size="2">Gitea admin service</Text>
                  <StatusBadge
                    label={hasGiteaAdminConfiguration() ? "Ready" : "Missing"}
                    tone={hasGiteaAdminConfiguration() ? "positive" : "warning"}
                  />
                </Flex>
                <Flex justify="between" align="center" gap="3">
                  <Text size="2">Bootstrap token</Text>
                  <StatusBadge
                    label={
                      bootstrapStatus.hasBootstrapToken ? "Ready" : "Missing"
                    }
                    tone={
                      bootstrapStatus.hasBootstrapToken ? "positive" : "warning"
                    }
                  />
                </Flex>
                <Flex justify="between" align="center" gap="3">
                  <Text size="2">Workspace settings row</Text>
                  <StatusBadge
                    label={
                      bootstrapStatus.hasWorkspaceSettings
                        ? "Will be updated"
                        : "Will be created"
                    }
                    tone="info"
                  />
                </Flex>
              </Flex>
            </SectionCard>

            <SectionCard
              title="What happens next"
              description="The setup action writes only the minimum data required for the first sign-in."
              eyebrow="Outcome"
            >
              <ol
                style={{
                  margin: 0,
                  paddingLeft: "1.1rem",
                  display: "grid",
                  gap: "0.7rem",
                }}
              >
                <li>
                  <Text color="gray">
                    The submitted email is promoted or created as an active
                    admin.
                  </Text>
                </li>
                <li>
                  <Text color="gray">
                    The workspace settings singleton is created or refreshed.
                  </Text>
                </li>
                <li>
                  <Text color="gray">
                    An audit event records the bootstrap completion.
                  </Text>
                </li>
              </ol>
            </SectionCard>
          </Flex>

          <SectionCard
            title="Bootstrap form"
            description="Use the same email address that will authenticate through Gitea after setup."
            eyebrow="Initialize"
          >
            <SetupForm
              bootstrapEnabled={bootstrapStatus.hasBootstrapToken}
              defaultValues={defaults}
            />
          </SectionCard>
        </Grid>
      </Flex>
    </Container>
  );
}
