import type { UserRole } from "@prisma/client";
import styles from "@/app/(app)/dashboard/page.module.css";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type DashboardOverviewProps = {
  displayName: string;
  role: UserRole;
};

export function DashboardOverview({
  displayName,
  role,
}: DashboardOverviewProps) {
  return (
    <div className={styles.grid}>
      <SectionCard
        title={`Welcome back, ${displayName}`}
        description={
          "This screen is the first protected shell for the self-hosted product. It intentionally focuses on system posture instead of fake business data."
        }
        eyebrow="Protected route"
      >
        <p className={styles.summary}>
          Your current role is <strong>{role.toLowerCase()}</strong>. As the
          product surface grows, this dashboard will branch into candidate
          provisioning, case repository operations, webhook monitoring, and
          reviewer workflows.
        </p>
      </SectionCard>

      <SectionCard title="Readiness status" eyebrow="Foundation">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <StatusBadge label="Prisma connected by contract" tone="info" />
          <StatusBadge
            label="Gitea admin services scaffolded"
            tone="positive"
          />
          <StatusBadge label="Bootstrap flow ready" tone="positive" />
          <StatusBadge label="Assignment flow ready" tone="positive" />
          <StatusBadge label="Reviewer workflows ready" tone="positive" />
          <StatusBadge label="Settings screen ready" tone="positive" />
          <StatusBadge label="Webhook sync pending" tone="warning" />
        </div>
      </SectionCard>

      <SectionCard
        className={styles.wide}
        title="Implementation checkpoints"
        eyebrow="Next steps"
      >
        <ol className={styles.list}>
          <li>Connect the real Gitea OAuth application credentials.</li>
          <li>
            Add webhook-driven synchronization for repository activity and
            candidate case state.
          </li>
          <li>
            Add operational metrics and summaries that read from real candidate,
            assignment, and review data.
          </li>
        </ol>
      </SectionCard>

      <SectionCard title="Initial operating metrics" eyebrow="Planned widgets">
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>
              Candidate accounts provisioned
            </span>
            <span className={styles.metricValue}>0</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>
              Case repositories attached
            </span>
            <span className={styles.metricValue}>0</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>
              Webhook deliveries tracked
            </span>
            <span className={styles.metricValue}>0</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
