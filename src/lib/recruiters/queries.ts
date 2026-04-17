import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getRecruiterInviteLifecycleStatus } from "@/lib/recruiter-invites/shared";

export type RecruiterInviteHistoryItem = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  claimedAt: Date | null;
  revokedAt: Date | null;
  resendSequence: number;
  issueKind: "INITIAL" | "RESEND";
  status: "PENDING" | "CLAIMED" | "REVOKED" | "EXPIRED";
  issuedByName: string | null;
};

export type RecruiterListItem = {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  giteaLogin: string | null;
  hasLinkedSignIn: boolean;
  isActive: boolean;
  inviteStatus: "PENDING" | "CLAIMED" | "REVOKED" | "EXPIRED" | null;
  inviteIssueKind: "INITIAL" | "RESEND" | null;
  inviteSequence: number | null;
  inviteCount: number;
  inviteResendCount: number;
  inviteIssuedByName: string | null;
  inviteExpiresAt: Date | null;
  inviteCreatedAt: Date | null;
  inviteClaimedAt: Date | null;
  inviteRevokedAt: Date | null;
  inviteHistory: RecruiterInviteHistoryItem[];
  createdAt: Date;
};

export async function listRecruiters() {
  const users = await db.user.findMany({
    where: {
      role: {
        in: [UserRole.ADMIN, UserRole.RECRUITER],
      },
    },
    include: {
      giteaIdentity: {
        select: {
          login: true,
        },
      },
      recruiterInvites: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          claimedAt: true,
          revokedAt: true,
          resendSequence: true,
          issueKind: true,
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          accounts: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map<RecruiterListItem>((user) => {
    const latestInvite = user.recruiterInvites[0] ?? null;
    const inviteHistory = user.recruiterInvites.map<RecruiterInviteHistoryItem>(
      (invite) => ({
        id: invite.id,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        claimedAt: invite.claimedAt,
        revokedAt: invite.revokedAt,
        resendSequence: invite.resendSequence,
        issueKind: invite.issueKind,
        status: getRecruiterInviteLifecycleStatus({
          claimedAt: invite.claimedAt,
          revokedAt: invite.revokedAt,
          expiresAt: invite.expiresAt,
        }),
        issuedByName: invite.createdBy?.name ?? invite.createdBy?.email ?? null,
      }),
    );

    return {
      id: user.id,
      role: user.role,
      displayName: user.name ?? "Unnamed team member",
      email: user.email ?? "No email",
      giteaLogin: user.giteaIdentity?.login ?? null,
      hasLinkedSignIn: user._count.accounts > 0,
      isActive: user.isActive,
      inviteStatus: latestInvite
        ? getRecruiterInviteLifecycleStatus({
            claimedAt: latestInvite.claimedAt,
            revokedAt: latestInvite.revokedAt,
            expiresAt: latestInvite.expiresAt,
          })
        : null,
      inviteIssueKind: latestInvite?.issueKind ?? null,
      inviteSequence: latestInvite?.resendSequence ?? null,
      inviteCount: user.recruiterInvites.length,
      inviteResendCount: Math.max(user.recruiterInvites.length - 1, 0),
      inviteIssuedByName:
        latestInvite?.createdBy?.name ?? latestInvite?.createdBy?.email ?? null,
      inviteExpiresAt: latestInvite?.expiresAt ?? null,
      inviteCreatedAt: latestInvite?.createdAt ?? null,
      inviteClaimedAt: latestInvite?.claimedAt ?? null,
      inviteRevokedAt: latestInvite?.revokedAt ?? null,
      inviteHistory,
      createdAt: user.createdAt,
    };
  });
}
