import { UserRole } from "@prisma/client";
import { AuditLogTable } from "@/app/(app)/dashboard/audit-trail/components/audit-log-table";
import { SectionCard } from "@/components/ui/section-card";
import { listRecentAuditLogs } from "@/lib/audit/queries";
import { requireRole } from "@/lib/auth/session";

export default async function AuditTrailPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const auditLogs = await listRecentAuditLogs();

  return (
    <SectionCard
      title="Recent audit events"
      description="Every provisioning and integration event is written locally so the hiring team can inspect what happened without relying on external logs first."
      eyebrow="Audit trail"
    >
      <AuditLogTable auditLogs={auditLogs} />
    </SectionCard>
  );
}
