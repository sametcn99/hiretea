import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { assertActorHasRole } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { getRecruiterInviteLifecycleStatus } from "@/lib/recruiter-invites/shared";

export async function revokeActiveRecruiterInvite(
  recruiterId: string,
  actor: AuthorizedActor,
) {
  assertActorHasRole(actor, [UserRole.ADMIN], "revoke recruiting team invites");

  const invite = await db.recruiterInvite.findFirst({
    where: {
      recruiterId,
      claimedAt: null,
      revokedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      recruiter: {
        select: {
          email: true,
          giteaIdentity: {
            select: {
              login: true,
            },
          },
        },
      },
    },
  });

  if (!invite) {
    throw new Error(
      "There is no active onboarding invite to revoke for this recruiting team member.",
    );
  }

  const status = getRecruiterInviteLifecycleStatus({
    claimedAt: invite.claimedAt,
    revokedAt: invite.revokedAt,
    expiresAt: invite.expiresAt,
  });

  if (status !== "PENDING") {
    throw new Error("Only active pending invites can be revoked.");
  }

  const revokedInvite = await db.recruiterInvite.update({
    where: { id: invite.id },
    data: { revokedAt: new Date() },
    select: { id: true },
  });

  await createAuditLog({
    action: "recruiter.invite.revoked",
    actorId: actor.actorId,
    resourceType: "RecruiterInvite",
    resourceId: revokedInvite.id,
    detail: {
      recruiterId,
      recruiterEmail: invite.recruiter.email,
      recruiterLogin: invite.recruiter.giteaIdentity?.login ?? null,
      issuedBy:
        invite.createdBy?.name ?? invite.createdBy?.email ?? "Unknown admin",
      resendSequence: invite.resendSequence,
      issueKind: invite.issueKind,
    },
  });

  return revokedInvite;
}
