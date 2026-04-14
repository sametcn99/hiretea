import { UserRole } from "@prisma/client";
import { Flex, Grid, Text } from "@radix-ui/themes";
import { WorkspaceSettingsForm } from "@/app/(app)/dashboard/settings/components/workspace-settings-form";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/session";
import { hasAuthConfiguration, hasGiteaAdminConfiguration } from "@/lib/env";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function SettingsPage() {
  await requireRole(UserRole.ADMIN);
  const settings = await getWorkspaceSettingsOrThrow();

  return (
    <Grid columns={{ initial: "1fr", lg: "minmax(340px, 440px) minmax(0, 1fr)" }} gap="4" align="start">
      <SectionCard
        style={{ position: "sticky", top: 28 }}
        title="Workspace settings"
        description="Update the singleton configuration used by candidate provisioning, template operations, and repository assignment flows."
        eyebrow="Admin only"
      >
        <WorkspaceSettingsForm settings={settings} />
      </SectionCard>

      <Flex direction="column" gap="4">
        <SectionCard
          title="Operational snapshot"
          description="These values are currently used across internal workflows."
          eyebrow="Current state"
        >
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center" gap="3">
              <Text size="2">Company name</Text>
              <Text size="2" weight="bold">{settings.companyName}</Text>
            </Flex>
            <Flex justify="between" align="center" gap="3">
              <Text size="2">Default branch</Text>
              <StatusBadge label={settings.defaultBranch} tone="info" />
            </Flex>
            <Flex justify="between" align="center" gap="3">
              <Text size="2">Manual invites</Text>
              <StatusBadge
                label={settings.manualInviteMode ? "Enabled" : "Disabled"}
                tone={settings.manualInviteMode ? "positive" : "warning"}
              />
            </Flex>
            <Flex justify="between" align="center" gap="3">
              <Text size="2">OAuth readiness</Text>
              <StatusBadge
                label={hasAuthConfiguration() ? "Ready" : "Missing"}
                tone={hasAuthConfiguration() ? "positive" : "warning"}
              />
            </Flex>
            <Flex justify="between" align="center" gap="3">
              <Text size="2">Gitea admin readiness</Text>
              <StatusBadge
                label={hasGiteaAdminConfiguration() ? "Ready" : "Missing"}
                tone={hasGiteaAdminConfiguration() ? "positive" : "warning"}
              />
            </Flex>
          </Flex>

          <Text size="1" color="gray" mt="2">
            Gitea base URL: {settings.giteaBaseUrl}
          </Text>
          <Text size="1" color="gray">
            Organization: {settings.giteaOrganization}
          </Text>
          <Text size="1" color="gray">
            Last updated: {dateFormatter.format(settings.updatedAt)}
          </Text>
        </SectionCard>

        <SectionCard
          title="Change guidance"
          description="These values affect repository creation and workflow behavior immediately after save."
          eyebrow="Before you edit"
        >
          <Flex asChild direction="column" gap="3" pl="4">
            <ol style={{ margin: 0, color: "var(--gray-11)", lineHeight: 1.6 }}>
              <li>
                Use the real Gitea organization slug that should own generated
                repositories.
              </li>
              <li>
                Changing the default branch affects future templates and candidate
                case assignments, not existing repositories.
              </li>
              <li>
                Disabling manual invites is a product decision only; email
                delivery is still not implemented.
              </li>
            </ol>
          </Flex>
        </SectionCard>
      </Flex>
    </Grid>
  );
}
