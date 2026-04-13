import type { AuditLog } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";

type AuditLogWithActor = AuditLog & {
  actor: {
    name: string | null;
    email: string | null;
  } | null;
};

type AuditLogTableProps = {
  auditLogs: AuditLogWithActor[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDetail(detail: AuditLog["detail"]) {
  if (!detail) {
    return "No additional detail";
  }

  return JSON.stringify(detail);
}

export function AuditLogTable({ auditLogs }: AuditLogTableProps) {
  if (auditLogs.length === 0) {
    return <p className="ht-muted">No audit events have been recorded yet.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="ui very basic table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Actor</th>
            <th>Resource</th>
            <th>Detail</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((auditLog) => (
            <tr key={auditLog.id}>
              <td>
                <StatusBadge label={auditLog.action} tone="info" />
              </td>
              <td>
                {auditLog.actor?.name ?? auditLog.actor?.email ?? "System"}
              </td>
              <td>
                {auditLog.resourceType}
                {auditLog.resourceId ? ` · ${auditLog.resourceId}` : ""}
              </td>
              <td>
                <code>{formatDetail(auditLog.detail)}</code>
              </td>
              <td>{dateFormatter.format(auditLog.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
