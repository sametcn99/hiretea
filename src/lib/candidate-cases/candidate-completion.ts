import {
  CandidateCaseCompletionSource,
  CandidateCaseStatus,
} from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import {
  getCandidateInviteLifecycleStatus,
  hashCandidateInviteToken,
} from "@/lib/candidate-invites/shared";
import { db } from "@/lib/db";
import {
  GiteaAdminClientError,
  type GiteaAdminUser,
  getGiteaAdminClient,
} from "@/lib/gitea/client";

/**
 * Discriminated union describing the candidate-facing completion UI state for
 * a single candidate case. Internal reviewer-finalization status is tracked
 * separately on `CandidateCase.status`.
 */
export type CandidateCompletionSignal =
  | { kind: "LOGIN_REQUIRED" }
  | { kind: "OPEN" }
  | {
      kind: "MARKED_REVERTIBLE";
      requestedAt: Date;
      source: CandidateCaseCompletionSource;
    }
  | {
      kind: "LOCKED_BY_DEADLINE";
      requestedAt: Date | null;
      lockedAt: Date;
      source: CandidateCaseCompletionSource;
    }
  | {
      kind: "LOCKED_BY_REVIEW";
      requestedAt: Date;
      source: CandidateCaseCompletionSource;
      firstReviewNoteAt: Date;
    };

export type CandidateCompletionFields = {
  candidateCompletionRequestedAt: Date | null;
  candidateCompletionLockedAt: Date | null;
  candidateCompletionSource: CandidateCaseCompletionSource | null;
};

type ComputeSignalInput = CandidateCompletionFields & {
  hasObservedLogin: boolean;
  firstReviewNoteAt: Date | null;
};

export function computeCandidateCompletionSignal(
  input: ComputeSignalInput,
): CandidateCompletionSignal {
  const {
    candidateCompletionRequestedAt,
    candidateCompletionLockedAt,
    candidateCompletionSource,
    hasObservedLogin,
    firstReviewNoteAt,
  } = input;

  if (candidateCompletionLockedAt) {
    return {
      kind: "LOCKED_BY_DEADLINE",
      requestedAt: candidateCompletionRequestedAt,
      lockedAt: candidateCompletionLockedAt,
      source: candidateCompletionSource ?? CandidateCaseCompletionSource.MANUAL,
    };
  }

  if (candidateCompletionRequestedAt) {
    if (firstReviewNoteAt) {
      return {
        kind: "LOCKED_BY_REVIEW",
        requestedAt: candidateCompletionRequestedAt,
        source:
          candidateCompletionSource ?? CandidateCaseCompletionSource.MANUAL,
        firstReviewNoteAt,
      };
    }

    return {
      kind: "MARKED_REVERTIBLE",
      requestedAt: candidateCompletionRequestedAt,
      source: candidateCompletionSource ?? CandidateCaseCompletionSource.MANUAL,
    };
  }

  if (!hasObservedLogin) {
    return { kind: "LOGIN_REQUIRED" };
  }

  return { kind: "OPEN" };
}

export function isCandidateCompletionActive(fields: CandidateCompletionFields) {
  return (
    fields.candidateCompletionRequestedAt !== null ||
    fields.candidateCompletionLockedAt !== null
  );
}

/**
 * Prisma where-clause fragment (spread into `where`) that restricts rows to
 * candidate-complete cases. Relies on the invariant that
 * `candidateCompletionLockedAt` is only set when
 * `candidateCompletionRequestedAt` is also set (auto-deadline path writes
 * both atomically).
 */
export const candidateCompletionActiveFilter = {
  candidateCompletionRequestedAt: { not: null },
};

/**
 * Extracts a usable login timestamp from a Gitea admin user payload.
 * Gitea returns an ISO string for `last_login`, or the RFC3339 zero value
 * "0001-01-01T00:00:00Z" when the user has never signed in.
 */
export function extractGiteaLoginTimestamp(
  user: Pick<GiteaAdminUser, "last_login"> | null | undefined,
): Date | null {
  const raw = user?.last_login;

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (parsed.getUTCFullYear() < 2000) {
    return null;
  }

  return parsed;
}

type ObservedLoginOutcome = {
  hasObservedLogin: boolean;
  lastObservedLoginAt: Date | null;
};

/**
 * Best-effort Gitea login observation. Updates the persisted
 * `firstObservedLoginAt` / `lastObservedLoginAt` on `GiteaIdentity` when a
 * newer login timestamp is returned by the Gitea admin API. Callers should
 * treat failures as "login not yet observed" rather than propagating them,
 * unless `{ strict: true }` is explicitly passed for the mutation path.
 */
export async function observeCandidateGiteaLogin(
  candidateUserId: string,
  options: { strict?: boolean } = {},
): Promise<ObservedLoginOutcome> {
  const identity = await db.giteaIdentity.findUnique({
    where: {
      userId: candidateUserId,
    },
    select: {
      id: true,
      login: true,
      firstObservedLoginAt: true,
      lastObservedLoginAt: true,
    },
  });

  if (!identity) {
    return { hasObservedLogin: false, lastObservedLoginAt: null };
  }

  let remoteLogin: Date | null = null;

  try {
    const client = await getGiteaAdminClient();
    const giteaUser = await client.getAdminUserByLogin(identity.login);
    remoteLogin = extractGiteaLoginTimestamp(giteaUser);
  } catch (error) {
    if (options.strict) {
      throw error instanceof GiteaAdminClientError
        ? error
        : new Error("Gitea sign-in status could not be verified right now.");
    }

    return {
      hasObservedLogin: identity.lastObservedLoginAt !== null,
      lastObservedLoginAt: identity.lastObservedLoginAt ?? null,
    };
  }

  if (!remoteLogin) {
    return {
      hasObservedLogin: identity.lastObservedLoginAt !== null,
      lastObservedLoginAt: identity.lastObservedLoginAt ?? null,
    };
  }

  const previousLast = identity.lastObservedLoginAt;

  if (!previousLast || remoteLogin.getTime() > previousLast.getTime()) {
    await db.giteaIdentity.update({
      where: {
        id: identity.id,
      },
      data: {
        lastObservedLoginAt: remoteLogin,
        firstObservedLoginAt: identity.firstObservedLoginAt ?? remoteLogin,
      },
    });
  }

  return {
    hasObservedLogin: true,
    lastObservedLoginAt: remoteLogin,
  };
}

type ResolveCandidateFromTokenInput = {
  token: string;
  candidateCaseId: string;
};

type ResolveCandidateFromTokenOutput = {
  candidateId: string;
  inviteId: string;
  candidateCase: {
    id: string;
    status: CandidateCaseStatus;
    dueAt: Date | null;
    candidateCompletionRequestedAt: Date | null;
    candidateCompletionLockedAt: Date | null;
    candidateCompletionSource: CandidateCaseCompletionSource | null;
    firstReviewNoteAt: Date | null;
  };
};

async function resolveCandidateCaseFromInviteToken(
  input: ResolveCandidateFromTokenInput,
): Promise<ResolveCandidateFromTokenOutput> {
  const invite = await db.candidateInvite.findUnique({
    where: {
      tokenHash: hashCandidateInviteToken(input.token),
    },
    select: {
      id: true,
      candidateId: true,
      claimedAt: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!invite) {
    throw new Error("This onboarding invite is invalid.");
  }

  const lifecycle = getCandidateInviteLifecycleStatus({
    claimedAt: invite.claimedAt,
    revokedAt: invite.revokedAt,
    expiresAt: invite.expiresAt,
  });

  if (lifecycle === "REVOKED") {
    throw new Error("This onboarding invite was revoked.");
  }

  const candidateCase = await db.candidateCase.findFirst({
    where: {
      id: input.candidateCaseId,
      candidateId: invite.candidateId,
    },
    select: {
      id: true,
      status: true,
      dueAt: true,
      candidateCompletionRequestedAt: true,
      candidateCompletionLockedAt: true,
      candidateCompletionSource: true,
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

  if (!candidateCase) {
    throw new Error(
      "This candidate case is not available from the current invite link.",
    );
  }

  return {
    candidateId: invite.candidateId,
    inviteId: invite.id,
    candidateCase: {
      id: candidateCase.id,
      status: candidateCase.status,
      dueAt: candidateCase.dueAt ?? null,
      candidateCompletionRequestedAt:
        candidateCase.candidateCompletionRequestedAt ?? null,
      candidateCompletionLockedAt:
        candidateCase.candidateCompletionLockedAt ?? null,
      candidateCompletionSource:
        candidateCase.candidateCompletionSource ?? null,
      firstReviewNoteAt: candidateCase.evaluationNotes[0]?.createdAt ?? null,
    },
  };
}

type MarkResult = {
  candidateCaseId: string;
  signal: CandidateCompletionSignal;
};

export async function markCandidateCaseCompleteFromInvite(
  input: ResolveCandidateFromTokenInput,
): Promise<MarkResult> {
  await syncExpiredCandidateCompletions();

  const resolved = await resolveCandidateCaseFromInviteToken(input);
  const { candidateCase, candidateId } = resolved;

  if (candidateCase.status === CandidateCaseStatus.ARCHIVED) {
    throw new Error("This candidate case is archived and cannot be updated.");
  }

  if (candidateCase.candidateCompletionLockedAt) {
    throw new Error(
      "The deadline for this case has passed. Completion is now locked.",
    );
  }

  if (candidateCase.candidateCompletionRequestedAt) {
    return {
      candidateCaseId: candidateCase.id,
      signal: computeCandidateCompletionSignal({
        candidateCompletionRequestedAt:
          candidateCase.candidateCompletionRequestedAt,
        candidateCompletionLockedAt: candidateCase.candidateCompletionLockedAt,
        candidateCompletionSource: candidateCase.candidateCompletionSource,
        hasObservedLogin: true,
        firstReviewNoteAt: candidateCase.firstReviewNoteAt,
      }),
    };
  }

  const login = await observeCandidateGiteaLogin(candidateId, {
    strict: true,
  });

  if (!login.hasObservedLogin) {
    throw new Error(
      "Sign in to Gitea with your candidate account before marking the case complete.",
    );
  }

  const now = new Date();

  if (candidateCase.dueAt && candidateCase.dueAt.getTime() <= now.getTime()) {
    throw new Error(
      "The deadline for this case has passed. Completion is now locked.",
    );
  }

  const updated = await db.candidateCase.update({
    where: {
      id: candidateCase.id,
    },
    data: {
      candidateCompletionRequestedAt: now,
      candidateCompletionSource: CandidateCaseCompletionSource.MANUAL,
    },
    select: {
      id: true,
      candidateCompletionRequestedAt: true,
      candidateCompletionLockedAt: true,
      candidateCompletionSource: true,
    },
  });

  await createAuditLog({
    action: "candidate.case.completion.marked",
    resourceType: "CandidateCase",
    resourceId: updated.id,
    detail: {
      source: CandidateCaseCompletionSource.MANUAL,
      inviteId: resolved.inviteId,
      requestedAt: now.toISOString(),
    },
  });

  return {
    candidateCaseId: updated.id,
    signal: computeCandidateCompletionSignal({
      candidateCompletionRequestedAt: updated.candidateCompletionRequestedAt,
      candidateCompletionLockedAt: updated.candidateCompletionLockedAt,
      candidateCompletionSource: updated.candidateCompletionSource,
      hasObservedLogin: true,
      firstReviewNoteAt: candidateCase.firstReviewNoteAt,
    }),
  };
}

export async function unmarkCandidateCaseCompleteFromInvite(
  input: ResolveCandidateFromTokenInput,
): Promise<MarkResult> {
  await syncExpiredCandidateCompletions();

  const resolved = await resolveCandidateCaseFromInviteToken(input);
  const { candidateCase } = resolved;

  if (candidateCase.candidateCompletionLockedAt) {
    throw new Error(
      "The deadline for this case has passed. Completion is now locked.",
    );
  }

  if (candidateCase.firstReviewNoteAt) {
    throw new Error(
      "A reviewer has already started evaluating this case. Completion can no longer be reverted.",
    );
  }

  if (!candidateCase.candidateCompletionRequestedAt) {
    return {
      candidateCaseId: candidateCase.id,
      signal: { kind: "OPEN" },
    };
  }

  const updated = await db.candidateCase.update({
    where: {
      id: candidateCase.id,
    },
    data: {
      candidateCompletionRequestedAt: null,
      candidateCompletionSource: null,
    },
    select: {
      id: true,
      candidateCompletionRequestedAt: true,
      candidateCompletionLockedAt: true,
      candidateCompletionSource: true,
    },
  });

  await createAuditLog({
    action: "candidate.case.completion.reverted",
    resourceType: "CandidateCase",
    resourceId: updated.id,
    detail: {
      inviteId: resolved.inviteId,
      previousRequestedAt:
        candidateCase.candidateCompletionRequestedAt.toISOString(),
    },
  });

  return {
    candidateCaseId: updated.id,
    signal: { kind: "OPEN" },
  };
}

type SyncExpiredOutcome = {
  autoLockedCount: number;
  deadlineLockedCount: number;
};

/**
 * Lazy deadline synchronizer. Called from every candidate-facing and
 * reviewer-facing entry point so due-date transitions take effect without a
 * scheduler. Safe to call on each request.
 */
export async function syncExpiredCandidateCompletions(
  now: Date = new Date(),
): Promise<SyncExpiredOutcome> {
  const [autoLockResult, deadlineLockResult] = await db.$transaction([
    db.candidateCase.updateMany({
      where: {
        dueAt: {
          lte: now,
        },
        candidateCompletionRequestedAt: null,
        candidateCompletionLockedAt: null,
        status: {
          notIn: [CandidateCaseStatus.ARCHIVED, CandidateCaseStatus.DRAFT],
        },
      },
      data: {
        candidateCompletionRequestedAt: now,
        candidateCompletionLockedAt: now,
        candidateCompletionSource: CandidateCaseCompletionSource.AUTO_DEADLINE,
      },
    }),
    db.candidateCase.updateMany({
      where: {
        dueAt: {
          lte: now,
        },
        candidateCompletionRequestedAt: {
          not: null,
        },
        candidateCompletionLockedAt: null,
        status: {
          not: CandidateCaseStatus.ARCHIVED,
        },
      },
      data: {
        candidateCompletionLockedAt: now,
      },
    }),
  ]);

  return {
    autoLockedCount: autoLockResult.count,
    deadlineLockedCount: deadlineLockResult.count,
  };
}
