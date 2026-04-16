import { Box, Code, Flex, Text } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateCaseDetail } from "@/lib/candidate-cases/queries";
import {
  formatCandidateCaseAuditDetail,
  formatCandidateCaseDate,
} from "./candidate-case-detail-helpers";

type CandidateCaseAuditTrailSectionProps = {
  candidateCase: CandidateCaseDetail;
};

export function CandidateCaseAuditTrailSection({
  candidateCase,
}: CandidateCaseAuditTrailSectionProps) {
  return (
    <SectionCard
      title="Audit trail"
      description="Internal operations and sync events recorded for this case and its repository."
      eyebrow="History"
    >
      {candidateCase.auditLogs.length === 0 ? (
        <Text as="p" size="2" color="gray">
          No audit events have been recorded for this case yet.
        </Text>
      ) : (
        <Box
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            display: "grid",
            gap: "0.9rem",
          }}
        >
          {candidateCase.auditLogs.map((auditLog) => (
            <Box
              key={auditLog.id}
              style={{
                border: "1px solid var(--gray-a5)",
                borderRadius: "var(--radius-3)",
                padding: "0.9rem",
              }}
            >
              <Flex direction="column" gap="2">
                <Flex justify="between" gap="3" wrap="wrap">
                  <StatusBadge label={auditLog.action} tone="info" />
                  <Text size="1" color="gray">
                    {formatCandidateCaseDate(auditLog.createdAt)}
                  </Text>
                </Flex>
                <Text size="1" color="gray">
                  Actor:{" "}
                  {auditLog.actor?.name ?? auditLog.actor?.email ?? "System"}
                </Text>
                <Text size="1" color="gray">
                  Resource: {auditLog.resourceType}
                  {auditLog.resourceId ? ` · ${auditLog.resourceId}` : ""}
                </Text>
                <Code
                  size="1"
                  style={{
                    display: "block",
                    maxHeight: "12rem",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {formatCandidateCaseAuditDetail(auditLog.detail)}
                </Code>
              </Flex>
            </Box>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
