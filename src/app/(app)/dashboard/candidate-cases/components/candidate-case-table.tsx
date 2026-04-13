import styles from "@/app/(app)/dashboard/candidate-cases/page.module.css";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateCaseListItem } from "@/lib/candidate-cases/queries";

type CandidateCaseTableProps = {
  candidateCases: CandidateCaseListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusToneMap = {
  DRAFT: "neutral",
  PROVISIONING: "info",
  READY: "positive",
  IN_PROGRESS: "info",
  REVIEWING: "warning",
  COMPLETED: "positive",
  ARCHIVED: "neutral",
} as const;

const decisionToneMap = {
  ADVANCE: "positive",
  HOLD: "neutral",
  REJECT: "warning",
} as const;

export function CandidateCaseTable({
  candidateCases,
}: CandidateCaseTableProps) {
  if (candidateCases.length === 0) {
    return (
      <p className={styles.emptyState}>
        No candidate cases are assigned yet. Use the form on the left to create
        the first working repository from a template.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={`ui very basic table ${styles.table}`}>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Template</th>
            <th>Repository</th>
            <th>Status</th>
            <th>Dates</th>
          </tr>
        </thead>
        <tbody>
          {candidateCases.map((candidateCase) => (
            <tr key={candidateCase.id}>
              <td>
                <strong>{candidateCase.candidateDisplayName}</strong>
                <span className={styles.metaText}>
                  {candidateCase.candidateEmail}
                </span>
                <span className={styles.metaText}>
                  {candidateCase.candidateLogin
                    ? `Gitea: ${candidateCase.candidateLogin}`
                    : "No linked Gitea login"}
                </span>
              </td>
              <td>
                <strong>{candidateCase.templateName}</strong>
                <span className={styles.metaText}>
                  Slug: {candidateCase.templateSlug}
                </span>
              </td>
              <td>
                {candidateCase.workingRepositoryUrl ? (
                  <a
                    className={styles.link}
                    href={candidateCase.workingRepositoryUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {candidateCase.workingRepository ?? "Open repository"}
                  </a>
                ) : (
                  <strong>
                    {candidateCase.workingRepository ?? "Pending"}
                  </strong>
                )}
                <span className={styles.metaText}>
                  Branch: {candidateCase.branchName ?? "Not set"}
                </span>
              </td>
              <td>
                <div className={styles.statusStack}>
                  <StatusBadge
                    label={candidateCase.status
                      .toLowerCase()
                      .replace(/_/g, " ")}
                    tone={statusToneMap[candidateCase.status]}
                  />
                  {candidateCase.decision ? (
                    <StatusBadge
                      label={candidateCase.decision.toLowerCase()}
                      tone={decisionToneMap[candidateCase.decision]}
                    />
                  ) : (
                    <StatusBadge label="No decision yet" tone="neutral" />
                  )}
                </div>
              </td>
              <td>
                <span className={styles.metaText}>
                  Created: {dateFormatter.format(candidateCase.createdAt)}
                </span>
                <span className={styles.metaText}>
                  Due:{" "}
                  {candidateCase.dueAt
                    ? dateFormatter.format(candidateCase.dueAt)
                    : "No due date"}
                </span>
                <span className={styles.metaText}>
                  Owner: {candidateCase.createdByName}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
