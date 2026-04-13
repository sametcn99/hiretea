import { UserRole } from "@prisma/client";
import { WorkspaceSettingsForm } from "@/app/(app)/dashboard/settings/components/workspace-settings-form";
import styles from "@/app/(app)/dashboard/settings/page.module.css";
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
    <div className={styles.grid}>
      <SectionCard
        className={styles.formCard}
        title="Workspace settings"
        description="Update the singleton configuration used by candidate provisioning, template operations, and repository assignment flows."
        eyebrow="Admin only"
      >
        <WorkspaceSettingsForm settings={settings} />
      </SectionCard>

      <div style={{ display: "grid", gap: "20px" }}>
        <SectionCard
          className={styles.summaryCard}
          title="Operational snapshot"
          description="These values are currently used across internal workflows."
          eyebrow="Current state"
        >
          <div className={styles.statList}>
            <div className={styles.statRow}>
              <span>Company name</span>
              <strong>{settings.companyName}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Default branch</span>
              <StatusBadge label={settings.defaultBranch} tone="info" />
            </div>
            <div className={styles.statRow}>
              <span>Manual invites</span>
              <StatusBadge
                label={settings.manualInviteMode ? "Enabled" : "Disabled"}
                tone={settings.manualInviteMode ? "positive" : "warning"}
              />
            </div>
            <div className={styles.statRow}>
              <span>OAuth readiness</span>
              <StatusBadge
                label={hasAuthConfiguration() ? "Ready" : "Missing"}
                tone={hasAuthConfiguration() ? "positive" : "warning"}
              />
            </div>
            <div className={styles.statRow}>
              <span>Gitea admin readiness</span>
              <StatusBadge
                label={hasGiteaAdminConfiguration() ? "Ready" : "Missing"}
                tone={hasGiteaAdminConfiguration() ? "positive" : "warning"}
              />
            </div>
          </div>

          <span className={styles.metaText}>
            Gitea base URL: {settings.giteaBaseUrl}
          </span>
          <span className={styles.metaText}>
            Organization: {settings.giteaOrganization}
          </span>
          <span className={styles.metaText}>
            Last updated: {dateFormatter.format(settings.updatedAt)}
          </span>
        </SectionCard>

        <SectionCard
          title="Change guidance"
          description="These values affect repository creation and workflow behavior immediately after save."
          eyebrow="Before you edit"
        >
          <ol className={styles.noteList}>
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
        </SectionCard>
      </div>
    </div>
  );
}
