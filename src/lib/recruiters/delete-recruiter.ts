import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { assertActorHasRole } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { deleteCandidateAccount } from "@/lib/gitea/accounts";
import { GiteaAdminClientError } from "@/lib/gitea/client";

export async function deleteRecruiter(
  recruiterId: string,
  actor: AuthorizedActor,
) {
  assertActorHasRole(
    actor,
    [UserRole.ADMIN],
    "archive recruiting team members",
  );

  const recruiter = await db.user.findUniqueOrThrow({
    where: { id: recruiterId },
    include: {
      giteaIdentity: true,
    },
  });

  if (recruiter.role !== UserRole.RECRUITER) {
    throw new Error("The selected recruiting team member does not exist.");
  }

  if (recruiter.giteaIdentity) {
    try {
      await deleteCandidateAccount({
        actorId: actor.actorId,
        username: recruiter.giteaIdentity.login,
        reason: "recruiter.account.deleted",
      });
    } catch (error) {
      if (!(error instanceof GiteaAdminClientError) || error.status !== 404) {
        throw error;
      }
    }
  }

  await db.$transaction([
    db.recruiterInvite.updateMany({
      where: {
        recruiterId,
        claimedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
    db.giteaIdentity.deleteMany({
      where: { userId: recruiterId },
    }),
    db.account.deleteMany({
      where: { userId: recruiterId },
    }),
    db.session.deleteMany({
      where: { userId: recruiterId },
    }),
    db.user.update({
      where: { id: recruiterId },
      data: { isActive: false },
    }),
  ]);

  await createAuditLog({
    action: "recruiter.archived",
    actorId: actor.actorId,
    resourceType: "Recruiter",
    resourceId: recruiter.id,
    detail: {
      email: recruiter.email,
      giteaLogin: recruiter.giteaIdentity?.login ?? null,
    },
  });
}
