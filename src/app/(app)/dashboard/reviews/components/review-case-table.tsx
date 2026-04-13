import type {
  CandidateCaseDecision,
  CandidateCaseStatus,
} from "@prisma/client";
import styles from "@/app/(app)/dashboard/reviews/page.module.css";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ReviewCaseListItem } from "@/lib/evaluation-notes/queries";

type ReviewCaseTableProps = {
  reviewCases: ReviewCaseListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusToneMap: Record<
  CandidateCaseStatus,
  "info" | "neutral" | "positive" | "warning"
> = {
  DRAFT: "neutral",
  PROVISIONING: "info",
  READY: "positive",
  IN_PROGRESS: "info",
  REVIEWING: "warning",
  COMPLETED: "positive",
  ARCHIVED: "neutral",
};

const decisionToneMap: Record<
  CandidateCaseDecision,
  "neutral" | "positive" | "warning"
> = {
  ADVANCE: "positive",
  HOLD: "neutral",
  REJECT: "warning",
};

export function ReviewCaseTable({ reviewCases }: ReviewCaseTableProps) {
  if (reviewCases.length === 0) {
    return (
      <p className={styles.emptyState}>
        No reviewable candidate cases exist yet. Assign a candidate case before
        recording reviewer notes.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={`ui very basic table ${styles.table}`}>
        <thead>
          <tr>
            <th>Candidate case</th>
            <th>Repository</th>
            <th>Review state</th>
            <th>Latest note</th>
            <th>Dates</th>
          </tr>
        </thead>
        <tbody>
          {reviewCases.map((reviewCase) => (
            <tr key={reviewCase.id}>
              <td>
                <strong>{reviewCase.candidateDisplayName}</strong>
                <span className={styles.metaText}>
                  {reviewCase.candidateEmail}
                </span>
                <span className={styles.metaText}>
                  {reviewCase.templateName}
                </span>
                <span className={styles.metaText}>
                  Slug: {reviewCase.templateSlug}
                </span>
              </td>
              <td>
                {reviewCase.workingRepositoryUrl ? (
                  <a
                    className={styles.link}
                    href={reviewCase.workingRepositoryUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {reviewCase.workingRepository ?? "Open repository"}
                  </a>
                ) : (
                  <strong>{reviewCase.workingRepository ?? "Pending"}</strong>
                )}
                <span className={styles.metaText}>
                  Candidate login: {reviewCase.candidateLogin ?? "Not linked"}
                </span>
              </td>
              <td>
                <div className={styles.statusStack}>
                  <StatusBadge
                    label={reviewCase.status.toLowerCase().replace(/_/g, " ")}
                    tone={statusToneMap[reviewCase.status]}
                  />
                  {reviewCase.decision ? (
                    <StatusBadge
                      label={reviewCase.decision.toLowerCase()}
                      tone={decisionToneMap[reviewCase.decision]}
                    />
                  ) : (
                    <StatusBadge label="No decision yet" tone="neutral" />
                  )}
                  <span className={styles.metaText}>
                    {reviewCase.notesCount} notes recorded
                  </span>
                </div>
              </td>
              <td>
                {typeof reviewCase.latestScore === "number" ? (
                  <strong>Score: {reviewCase.latestScore}/10</strong>
                ) : (
                  <strong>No score yet</strong>
                )}
                <span className={styles.metaText}>
                  {reviewCase.latestSummary ??
                    "No review summary recorded yet."}
                </span>
                <span className={styles.metaText}>
                  Reviewer: {reviewCase.latestReviewerName ?? "Not reviewed"}
                </span>
              </td>
              <td>
                <span className={styles.metaText}>
                  Due:{" "}
                  {reviewCase.dueAt
                    ? dateFormatter.format(reviewCase.dueAt)
                    : "No due date"}
                </span>
                <span className={styles.metaText}>
                  Last review:{" "}
                  {reviewCase.latestReviewedAt
                    ? dateFormatter.format(reviewCase.latestReviewedAt)
                    : "No notes yet"}
                </span>
                <span className={styles.metaText}>
                  Finalized:{" "}
                  {reviewCase.reviewedAt
                    ? dateFormatter.format(reviewCase.reviewedAt)
                    : "Not completed"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
