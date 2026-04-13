import type { Route } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/app/(public)/setup/components/setup-form";
import styles from "@/app/(public)/setup/page.module.css";
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
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.hero}>
          <AppLogo subtitle="First-run workspace bootstrap" />
          <div>
            <p className="ht-kicker">Workspace setup</p>
            <h1 className={styles.title}>
              Initialize the first internal admin
            </h1>
          </div>
          <p className={styles.copy}>
            This one-time flow seeds the first admin user and writes the initial
            workspace settings. After setup completes, all access continues
            through your self-hosted Gitea OAuth login.
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.stack}>
            <SectionCard
              title="Readiness checks"
              description="The first setup depends on both environment configuration and the bootstrap token."
              eyebrow="Before you submit"
            >
              <div className={styles.statusList}>
                <div className={styles.statusRow}>
                  <span>Gitea OAuth variables</span>
                  <StatusBadge
                    label={hasAuthConfiguration() ? "Ready" : "Missing"}
                    tone={hasAuthConfiguration() ? "positive" : "warning"}
                  />
                </div>
                <div className={styles.statusRow}>
                  <span>Gitea admin service</span>
                  <StatusBadge
                    label={hasGiteaAdminConfiguration() ? "Ready" : "Missing"}
                    tone={hasGiteaAdminConfiguration() ? "positive" : "warning"}
                  />
                </div>
                <div className={styles.statusRow}>
                  <span>Bootstrap token</span>
                  <StatusBadge
                    label={
                      bootstrapStatus.hasBootstrapToken ? "Ready" : "Missing"
                    }
                    tone={
                      bootstrapStatus.hasBootstrapToken ? "positive" : "warning"
                    }
                  />
                </div>
                <div className={styles.statusRow}>
                  <span>Workspace settings row</span>
                  <StatusBadge
                    label={
                      bootstrapStatus.hasWorkspaceSettings
                        ? "Will be updated"
                        : "Will be created"
                    }
                    tone="info"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="What happens next"
              description="The setup action writes only the minimum data required for the first sign-in."
              eyebrow="Outcome"
            >
              <ol className={styles.bulletList}>
                <li>
                  The submitted email is promoted or created as an active admin.
                </li>
                <li>
                  The workspace settings singleton is created or refreshed.
                </li>
                <li>An audit event records the bootstrap completion.</li>
              </ol>
            </SectionCard>
          </div>

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
        </div>
      </div>
    </div>
  );
}
