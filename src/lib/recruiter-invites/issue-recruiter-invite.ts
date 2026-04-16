import { RecruiterInviteIssueKind, UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { assertActorHasRole } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import {
  buildRecruiterInviteUrl,
  generateRecruiterInviteToken,
  getRecruiterInviteExpiryDate,
  hashRecruiterInviteToken,
} from "@/lib/recruiter-invites/shared";

export async function issueRecruiterInvite(
  recruiterId: string,
  actor: AuthorizedActor,
) {
  assertActorHasRole(actor, [UserRole.ADMIN], "issue recruiting team invites");

  const recruiter = await db.user.findUnique({
    where: { id: recruiterId },
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

  if (!recruiter || recruiter.role !== UserRole.RECRUITER) {
    throw new Error("The selected recruiting team member does not exist.");
  }

  if (!recruiter.isActive) {
    throw new Error(
      "Inactive recruiting team members cannot receive a new invite.",
    );
  }

  if (!recruiter.giteaIdentity?.login) {
    throw new Error(
      "The selected recruiting team member does not have a linked Gitea identity.",
    );
  }

  if (!recruiter.giteaIdentity.initialPassword) {
    throw new Error(
      "This recruiting team member already completed the first sign-in, so a new onboarding invite is no longer needed.",
    );
  }

  const now = new Date();
  const token = generateRecruiterInviteToken();
  const expiresAt = getRecruiterInviteExpiryDate(now);

  const { invite, supersededInviteIds } = await db.$transaction(
    async (transaction) => {
      const latestInvite = await transaction.recruiterInvite.findFirst({
        where: { recruiterId },
        orderBy: { createdAt: "desc" },
        select: { id: true, resendSequence: true },
      });

      const supersededInvites = await transaction.recruiterInvite.findMany({
        where: {
          recruiterId,
          claimedAt: null,
          revokedAt: null,
        },
        select: { id: true },
      });

      await transaction.recruiterInvite.updateMany({
        where: {
          recruiterId,
          claimedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      const resendSequence = (latestInvite?.resendSequence ?? 0) + 1;
      const issueKind = latestInvite
        ? RecruiterInviteIssueKind.RESEND
        : RecruiterInviteIssueKind.INITIAL;

      const invite = await transaction.recruiterInvite.create({
        data: {
          recruiterId,
          createdById: actor.actorId,
          previousInviteId: latestInvite?.id,
          issueKind,
          resendSequence,
          tokenHash: hashRecruiterInviteToken(token),
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
        supersededInviteIds: supersededInvites.map((item) => item.id),
      };
    },
  );

  await createAuditLog({
    action:
      invite.issueKind === RecruiterInviteIssueKind.RESEND
        ? "recruiter.invite.resent"
        : "recruiter.invite.issued",
    actorId: actor.actorId,
    resourceType: "RecruiterInvite",
    resourceId: invite.id,
    detail: {
      recruiterId,
      recruiterEmail: recruiter.email,
      recruiterLogin: recruiter.giteaIdentity.login,
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
    inviteUrl: buildRecruiterInviteUrl(token),
    expiresAt: invite.expiresAt,
    issueKind: invite.issueKind,
    resendSequence: invite.resendSequence,
  };
}
