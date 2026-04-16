import { UserRole } from "@prisma/client";
import { getCandidateInviteLifecycleStatus } from "@/lib/candidate-invites/shared";
import { db } from "@/lib/db";

export type CandidateInviteHistoryItem = {
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

export type CandidateListItem = {
  id: string;
  displayName: string;
  email: string;
  giteaLogin: string | null;
  caseCount: number;
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
  inviteHistory: CandidateInviteHistoryItem[];
  createdAt: Date;
};

export async function listCandidates() {
  const users = await db.user.findMany({
    where: {
      role: UserRole.CANDIDATE,
    },
    include: {
      giteaIdentity: {
        select: {
          login: true,
        },
      },
      candidateInvites: {
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
          candidateCases: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map<CandidateListItem>((user) => {
    const latestInvite = user.candidateInvites[0] ?? null;
    const inviteHistory = user.candidateInvites.map<CandidateInviteHistoryItem>(
      (invite) => ({
        id: invite.id,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        claimedAt: invite.claimedAt,
        revokedAt: invite.revokedAt,
        resendSequence: invite.resendSequence,
        issueKind: invite.issueKind,
        status: getCandidateInviteLifecycleStatus({
          claimedAt: invite.claimedAt,
          revokedAt: invite.revokedAt,
          expiresAt: invite.expiresAt,
        }),
        issuedByName: invite.createdBy?.name ?? invite.createdBy?.email ?? null,
      }),
    );

    return {
      id: user.id,
      displayName: user.name ?? "Unnamed candidate",
      email: user.email ?? "No email",
      giteaLogin: user.giteaIdentity?.login ?? null,
      caseCount: user._count.candidateCases,
      hasLinkedSignIn: user._count.accounts > 0,
      isActive: user.isActive,
      inviteStatus: latestInvite
        ? getCandidateInviteLifecycleStatus({
            claimedAt: latestInvite.claimedAt,
            revokedAt: latestInvite.revokedAt,
            expiresAt: latestInvite.expiresAt,
          })
        : null,
      inviteIssueKind: latestInvite?.issueKind ?? null,
      inviteSequence: latestInvite?.resendSequence ?? null,
      inviteCount: user.candidateInvites.length,
      inviteResendCount: Math.max(user.candidateInvites.length - 1, 0),
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
