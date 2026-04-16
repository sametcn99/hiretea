import { createAuditLog } from "@/lib/audit/log";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { getCandidateInviteLifecycleStatus } from "@/lib/candidate-invites/shared";
import { db } from "@/lib/db";

export async function revokeActiveCandidateInvite(
  candidateId: string,
  actor: AuthorizedActor,
) {
  const invite = await db.candidateInvite.findFirst({
    where: {
      candidateId,
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
      candidate: {
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
      "There is no active onboarding invite to revoke for this candidate.",
    );
  }

  const status = getCandidateInviteLifecycleStatus({
    claimedAt: invite.claimedAt,
    revokedAt: invite.revokedAt,
    expiresAt: invite.expiresAt,
  });

  if (status !== "PENDING") {
    throw new Error("Only active pending invites can be revoked.");
  }

  const revokedInvite = await db.candidateInvite.update({
    where: {
      id: invite.id,
    },
    data: {
      revokedAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  await createAuditLog({
    action: "candidate.invite.revoked",
    actorId: actor.actorId,
    resourceType: "CandidateInvite",
    resourceId: revokedInvite.id,
    detail: {
      candidateId,
      candidateEmail: invite.candidate.email,
      candidateLogin: invite.candidate.giteaIdentity?.login ?? null,
      issuedBy:
        invite.createdBy?.name ?? invite.createdBy?.email ?? "Unknown operator",
      resendSequence: invite.resendSequence,
      issueKind: invite.issueKind,
    },
  });

  return revokedInvite;
}
