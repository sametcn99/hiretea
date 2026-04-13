import styles from "@/app/(app)/dashboard/candidates/page.module.css";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateListItem } from "@/lib/candidates/queries";

type CandidateTableProps = {
  candidates: CandidateListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CandidateTable({ candidates }: CandidateTableProps) {
  if (candidates.length === 0) {
    return (
      <p className={styles.emptyState}>
        No candidates are provisioned yet. Start by creating the first candidate
        account from the form on the left.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={`ui very basic table ${styles.table}`}>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Access</th>
            <th>Cases</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id}>
              <td>
                <strong>{candidate.displayName}</strong>
                <span className={styles.metaText}>{candidate.email}</span>
                <span className={styles.metaText}>
                  {candidate.giteaLogin
                    ? `Gitea: ${candidate.giteaLogin}`
                    : "No linked Gitea login"}
                </span>
              </td>
              <td>
                <StatusBadge
                  label={candidate.isActive ? "Active" : "Inactive"}
                  tone={candidate.isActive ? "positive" : "warning"}
                />
                <div style={{ marginTop: "8px" }}>
                  <StatusBadge
                    label={
                      candidate.hasLinkedSignIn
                        ? "Connected"
                        : "Awaiting first sign-in"
                    }
                    tone={candidate.hasLinkedSignIn ? "info" : "neutral"}
                  />
                </div>
              </td>
              <td>{candidate.caseCount}</td>
              <td>{dateFormatter.format(candidate.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
