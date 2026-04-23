import { CandidateCaseStatus } from "@prisma/client";
import {
  type CandidateCompletionSignal,
  computeCandidateCompletionSignal,
  observeCandidateGiteaLogin,
  syncExpiredCandidateCompletions,
} from "@/lib/candidate-cases/candidate-completion";
import {
  type CandidateInviteLifecycleStatus,
  getCandidateInviteLifecycleStatus,
  hashCandidateInviteToken,
} from "@/lib/candidate-invites/shared";
import { db } from "@/lib/db";

const candidateCaseSurfaceStatuses: CandidateCaseStatus[] = [
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
  CandidateCaseStatus.COMPLETED,
];

export type CandidateInviteLanding = {
  inviteId: string;
  displayName: string;
  email: string;
  login: string | null;
  status: CandidateInviteLifecycleStatus;
  expiresAt: Date;
  createdAt: Date;
  passwordAvailable: boolean;
};

export type CandidateInviteCaseSummary = {
  candidateCaseId: string;
  templateName: string;
  templateSlug: string;
  status: CandidateCaseStatus;
  workingRepository: string | null;
  workingRepositoryUrl: string | null;
  dueAt: Date | null;
  completion: CandidateCompletionSignal;
};

export type CandidateInvitePageData = {
  landing: CandidateInviteLanding;
  cases: CandidateInviteCaseSummary[];
  hasObservedLogin: boolean;
};

type InviteRecord = {
  id: string;
  expiresAt: Date;
  claimedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  candidateId: string;
  candidate: {
    name: string | null;
    email: string | null;
    isActive: boolean;
    giteaIdentity: {
      login: string;
      initialPassword: string | null;
      lastObservedLoginAt: Date | null;
    } | null;
  };
};

async function getInviteRecord(token: string): Promise<InviteRecord | null> {
  return db.candidateInvite.findUnique({
    where: {
      tokenHash: hashCandidateInviteToken(token),
    },
    select: {
      id: true,
      expiresAt: true,
      claimedAt: true,
      revokedAt: true,
      createdAt: true,
      candidateId: true,
      candidate: {
        select: {
          name: true,
          email: true,
          isActive: true,
          giteaIdentity: {
            select: {
              login: true,
              initialPassword: true,
              lastObservedLoginAt: true,
            },
          },
        },
      },
    },
  });
}

function toLanding(invite: InviteRecord): CandidateInviteLanding {
  return {
    inviteId: invite.id,
    displayName: invite.candidate.name ?? invite.candidate.email ?? "Candidate",
    email: invite.candidate.email ?? "No email available",
    login: invite.candidate.giteaIdentity?.login ?? null,
    status: getCandidateInviteLifecycleStatus({
      claimedAt: invite.claimedAt,
      revokedAt: invite.revokedAt,
      expiresAt: invite.expiresAt,
    }),
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    passwordAvailable: Boolean(invite.candidate.giteaIdentity?.initialPassword),
  };
}

export async function getCandidateInviteLanding(
  token: string,
): Promise<CandidateInviteLanding | null> {
  const invite = await getInviteRecord(token);

  if (!invite) {
    return null;
  }

  return toLanding(invite);
}

export async function getCandidateInvitePageData(
  token: string,
): Promise<CandidateInvitePageData | null> {
  const invite = await getInviteRecord(token);

  if (!invite) {
    return null;
  }

  await syncExpiredCandidateCompletions();

  const loginOutcome = await observeCandidateGiteaLogin(invite.candidateId);
  const hasObservedLogin = loginOutcome.hasObservedLogin;

  const candidateCases = await db.candidateCase.findMany({
    where: {
      candidateId: invite.candidateId,
      status: {
        in: candidateCaseSurfaceStatuses,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      dueAt: true,
      workingRepository: true,
      workingRepositoryUrl: true,
      candidateCompletionRequestedAt: true,
      candidateCompletionLockedAt: true,
      candidateCompletionSource: true,
      caseTemplate: {
        select: {
          name: true,
          slug: true,
        },
      },
      evaluationNotes: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
        },
      },
    },
  });

  const cases = candidateCases.map<CandidateInviteCaseSummary>(
    (candidateCase) => ({
      candidateCaseId: candidateCase.id,
      templateName: candidateCase.caseTemplate.name,
      templateSlug: candidateCase.caseTemplate.slug,
      status: candidateCase.status,
      workingRepository: candidateCase.workingRepository ?? null,
      workingRepositoryUrl: candidateCase.workingRepositoryUrl ?? null,
      dueAt: candidateCase.dueAt ?? null,
      completion: computeCandidateCompletionSignal({
        candidateCompletionRequestedAt:
          candidateCase.candidateCompletionRequestedAt ?? null,
        candidateCompletionLockedAt:
          candidateCase.candidateCompletionLockedAt ?? null,
        candidateCompletionSource:
          candidateCase.candidateCompletionSource ?? null,
        hasObservedLogin,
        firstReviewNoteAt: candidateCase.evaluationNotes[0]?.createdAt ?? null,
      }),
    }),
  );

  return {
    landing: toLanding(invite),
    cases,
    hasObservedLogin,
  };
}
