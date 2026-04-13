import { db } from "@/lib/db";

export async function listRecentAuditLogs(limit = 25) {
  return db.auditLog.findMany({
    include: {
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}
