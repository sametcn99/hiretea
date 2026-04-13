import { db } from "@/lib/db";

type CreateAuditLogInput = {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  actorId?: string | null;
  detail?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return db.auditLog.create({
    data: {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      actorId: input.actorId,
      detail: (input.detail ?? null) as never,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
