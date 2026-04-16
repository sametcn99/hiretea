import { CandidateInviteIssueKind, UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import {
  buildCandidateInviteUrl,
  generateCandidateInviteToken,
  getCandidateInviteExpiryDate,
  hashCandidateInviteToken,
} from "@/lib/candidate-invites/shared";
import { db } from "@/lib/db";

export async function issueCandidateInvite(
  candidateId: string,
  actor: AuthorizedActor,
) {
  const candidate = await db.user.findUnique({
    where: {
      id: candidateId,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
      name: true,
      email: true,
      giteaIdentity: {
        select: {
          login: true,
          initialPassword: true,
        },
      },
    },
  });

  if (!candidate || candidate.role !== UserRole.CANDIDATE) {
    throw new Error("The selected candidate does not exist.");
  }

  if (!candidate.isActive) {
    throw new Error("Inactive candidates cannot receive a new invite.");
  }

  if (!candidate.giteaIdentity?.login) {
    throw new Error(
      "The selected candidate does not have a linked Gitea identity.",
    );
  }

  if (!candidate.giteaIdentity.initialPassword) {
    throw new Error(
      "This candidate already completed the first sign-in, so a new onboarding invite is no longer needed.",
    );
  }

  const now = new Date();
  const token = generateCandidateInviteToken();
  const expiresAt = getCandidateInviteExpiryDate(now);

  const { invite, supersededInviteIds } = await db.$transaction(
    async (transaction) => {
      const latestInvite = await transaction.candidateInvite.findFirst({
        where: {
          candidateId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          resendSequence: true,
        },
      });

      const supersededInvites = await transaction.candidateInvite.findMany({
        where: {
          candidateId,
          claimedAt: null,
          revokedAt: null,
        },
        select: {
          id: true,
        },
      });

      await transaction.candidateInvite.updateMany({
        where: {
          candidateId,
          claimedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      const resendSequence = (latestInvite?.resendSequence ?? 0) + 1;
      const issueKind = latestInvite
        ? CandidateInviteIssueKind.RESEND
        : CandidateInviteIssueKind.INITIAL;

      const invite = await transaction.candidateInvite.create({
        data: {
          candidateId,
          createdById: actor.actorId,
          previousInviteId: latestInvite?.id,
          issueKind,
          resendSequence,
          tokenHash: hashCandidateInviteToken(token),
          expiresAt,
        },
        select: {
          id: true,
          expiresAt: true,
          issueKind: true,
          resendSequence: true,
          previousInviteId: true,
        },
      });

      return {
        invite,
        supersededInviteIds: supersededInvites.map((supersededInvite) =>
          supersededInvite.id,
        ),
      };
    },
  );

  await createAuditLog({
    action:
      invite.issueKind === CandidateInviteIssueKind.RESEND
        ? "candidate.invite.resent"
        : "candidate.invite.issued",
    actorId: actor.actorId,
    resourceType: "CandidateInvite",
    resourceId: invite.id,
    detail: {
      candidateId,
      candidateEmail: candidate.email,
      candidateLogin: candidate.giteaIdentity.login,
      expiresAt: invite.expiresAt.toISOString(),
      issueKind: invite.issueKind,
      resendSequence: invite.resendSequence,
      previousInviteId: invite.previousInviteId,
      supersededInviteIds,
      deliveryMode: "manual-link",
    },
  });

  return {
    inviteId: invite.id,
    inviteUrl: buildCandidateInviteUrl(token),
    expiresAt: invite.expiresAt,
    issueKind: invite.issueKind,
    resendSequence: invite.resendSequence,
  };
}
