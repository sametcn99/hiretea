import Link from "next/link";
import styles from "@/app/(public)/page.module.css";
import { AppLogo } from "@/components/ui/app-logo";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

const operationalHighlights = [
  {
    title: "Own your hiring infrastructure",
    description:
      "Hiretea stays inside your environment, plugs into your self-hosted Gitea instance, and keeps engineering challenges under your control.",
  },
  {
    title: "Provision candidate access with intent",
    description:
      "Create candidate accounts, assign repository permissions, and evolve access rules without leaving the hiring workspace.",
  },
  {
    title: "Audit every step of the case lifecycle",
    description:
      "Track repository creation, permission updates, webhook deliveries, and evaluation signals from a single operational surface.",
  },
];

export function LandingHero() {
  return (
    <div className={styles.page}>
      <div className="ht-container">
        <div className={styles.hero}>
          <section className={`ui segment ht-surface-card ${styles.heroPanel}`}>
            <AppLogo />

            <div>
              <p className="ht-kicker">Engineering case operations</p>
              <h1 className={styles.headline}>
                Run technical hiring through the Gitea stack your team already
                owns.
              </h1>
            </div>

            <p className={styles.summary}>
              Hiretea is a self-hosted control plane for technical assessments.
              Your hiring team provisions case repositories, candidate accounts,
              access grants, and review workflows against your own Gitea
              instance without outsourcing the workflow.
            </p>

            <div className={styles.heroActions}>
              <Link className="ui primary button" href="/sign-in">
                Continue to sign in
              </Link>
              <Link className="ui button" href="/dashboard">
                Preview the dashboard shell
              </Link>
            </div>

            <div className={styles.statRow}>
              <StatusBadge label="Dark mode only" tone="info" />
              <StatusBadge label="Self-hosted by default" tone="positive" />
              <StatusBadge label="English-only product copy" tone="neutral" />
            </div>
          </section>

          <aside className={`ui segment ht-surface-card ${styles.heroAside}`}>
            <div className="ht-page-header">
              <div>
                <p className="ht-kicker">Foundation snapshot</p>
                <h2 style={{ margin: "0.35rem 0 0" }}>
                  What this first integration adds
                </h2>
              </div>
              <StatusBadge label="In progress" tone="warning" />
            </div>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoItemTitle}>Auth boundary</span>
                <span className="ht-muted">
                  NextAuth-based sign in, route protection, and typed session
                  helpers.
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoItemTitle}>Domain structure</span>
                <span className="ht-muted">
                  Dedicated modules for Gitea, audit logging, permissions, and
                  database access.
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoItemTitle}>
                  Self-host readiness
                </span>
                <span className="ht-muted">
                  Docker, PostgreSQL, Prisma, and explicit environment contracts
                  for deployment.
                </span>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.sectionGrid}>
          {operationalHighlights.map((highlight) => (
            <SectionCard
              key={highlight.title}
              title={highlight.title}
              description={highlight.description}
            />
          ))}

          <SectionCard
            eyebrow="Initial workflow"
            title="How the platform is expected to operate"
          >
            <ol className={styles.list}>
              <li>
                Create or connect a case repository in your Gitea organization.
              </li>
              <li>
                Create a candidate account with controlled repository access.
              </li>
              <li>
                Track commits, issues, and pull requests through webhook-driven
                updates.
              </li>
            </ol>
          </SectionCard>

          <SectionCard
            eyebrow="Implementation posture"
            title="Why the codebase starts with strict boundaries"
          >
            <ol className={styles.list}>
              <li>Page layers stay thin and delegate to domain services.</li>
              <li>
                Shared UI primitives centralize Fomantic-specific styling
                decisions.
              </li>
              <li>
                New features can extend modules without rewriting existing
                flows.
              </li>
            </ol>
          </SectionCard>

          <SectionCard
            eyebrow="Current direction"
            title="What comes next after this baseline"
          >
            <ol className={styles.list}>
              <li>
                Wire the real Gitea OAuth application and admin token into the
                environment.
              </li>
              <li>
                Run the first Prisma migration and seed an initial admin user.
              </li>
              <li>
                Replace placeholder dashboards with repository, candidate, and
                case screens.
              </li>
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
