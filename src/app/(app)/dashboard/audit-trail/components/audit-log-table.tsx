import type { AuditLog } from "@prisma/client";
import { Code, Table, Text } from "@radix-ui/themes";
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
    return (
      <Text as="p" size="2" color="gray">
        No audit events have been recorded yet.
      </Text>
    );
  }

  return (
    <Table.Root variant="ghost">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Actor</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Resource</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Detail</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Timestamp</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {auditLogs.map((auditLog) => (
          <Table.Row key={auditLog.id}>
            <Table.Cell>
              <StatusBadge label={auditLog.action} tone="info" />
            </Table.Cell>
            <Table.Cell>
              <Text size="2">
                {auditLog.actor?.name ?? auditLog.actor?.email ?? "System"}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="2">
                {auditLog.resourceType}
                {auditLog.resourceId ? ` · ${auditLog.resourceId}` : ""}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Code size="1" style={{ wordBreak: "break-all" }}>
                {formatDetail(auditLog.detail)}
              </Code>
            </Table.Cell>
            <Table.Cell>
              <Text size="2">{dateFormatter.format(auditLog.createdAt)}</Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
