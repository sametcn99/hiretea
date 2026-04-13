import styles from "@/app/(app)/dashboard/case-templates/page.module.css";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CaseTemplateListItem } from "@/lib/case-templates/queries";

type CaseTemplateTableProps = {
  templates: CaseTemplateListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CaseTemplateTable({ templates }: CaseTemplateTableProps) {
  if (templates.length === 0) {
    return (
      <p className={styles.emptyState}>
        No case templates are available yet. Create the first reusable challenge
        from the form on the left.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={`ui very basic table ${styles.table}`}>
        <thead>
          <tr>
            <th>Template</th>
            <th>Repository</th>
            <th>Usage</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id}>
              <td>
                <strong>{template.name}</strong>
                <span className={styles.metaText}>Slug: {template.slug}</span>
                <span className={styles.metaText}>{template.summary}</span>
              </td>
              <td>
                <StatusBadge label={template.defaultBranch} tone="info" />
                <span className={styles.metaText}>
                  {template.repositoryName}
                </span>
                {template.repositoryDescription ? (
                  <span className={styles.metaText}>
                    {template.repositoryDescription}
                  </span>
                ) : null}
              </td>
              <td>
                {template.candidateCaseCount}
                <span className={styles.metaText}>
                  Assigned candidate cases
                </span>
              </td>
              <td>
                {dateFormatter.format(template.createdAt)}
                <span className={styles.metaText}>
                  Owner: {template.createdByName}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
