import { CandidateCaseStatus, type Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import {
  type AuthorizedActor,
  assertInternalOperator,
} from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { GiteaAdminClientError } from "@/lib/gitea/client";
import { grantRepositoryAccess } from "@/lib/gitea/permissions";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";

function parseArchivedPreviousStatus(detail: Prisma.JsonValue | null) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return null;
  }

  const previousStatus = (detail as { previousStatus?: unknown })
    .previousStatus;

  if (
    typeof previousStatus === "string" &&
    Object.values(CandidateCaseStatus).includes(
      previousStatus as CandidateCaseStatus,
    ) &&
    previousStatus !== CandidateCaseStatus.ARCHIVED
  ) {
    return previousStatus as CandidateCaseStatus;
  }

  return null;
}

function getFallbackRestoreStatus(input: {
  decision: string | null;
  reviewedAt: Date | null;
  submittedAt: Date | null;
  workingRepository: string | null;
}) {
  if (input.reviewedAt || input.decision) {
    return CandidateCaseStatus.COMPLETED;
  }

  if (input.submittedAt) {
    return CandidateCaseStatus.REVIEWING;
  }

  if (input.workingRepository) {
    return CandidateCaseStatus.READY;
  }

  return CandidateCaseStatus.DRAFT;
}

export async function restoreCandidateCase(
  caseId: string,
  actor: AuthorizedActor,
) {
  assertInternalOperator(actor, "restore candidate cases");

  const candidateCase = await db.candidateCase.findUniqueOrThrow({
    where: {
      id: caseId,
    },
    select: {
      id: true,
      status: true,
      decision: true,
      reviewedAt: true,
      submittedAt: true,
      workingRepository: true,
      candidate: {
        select: {
          id: true,
          isActive: true,
          giteaIdentity: {
            select: {
              login: true,
            },
          },
        },
      },
      caseTemplate: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (candidateCase.status !== CandidateCaseStatus.ARCHIVED) {
    throw new Error("Only archived candidate cases can be restored.");
  }

  const latestArchiveAudit = await db.auditLog.findFirst({
    where: {
      action: "candidate.case.archived",
      resourceType: "CandidateCase",
      resourceId: candidateCase.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      detail: true,
    },
  });

  const restoreStatus =
    parseArchivedPreviousStatus(
      latestArchiveAudit?.detail as Prisma.JsonValue,
    ) ??
    getFallbackRestoreStatus({
      decision: candidateCase.decision,
      reviewedAt: candidateCase.reviewedAt,
      submittedAt: candidateCase.submittedAt,
      workingRepository: candidateCase.workingRepository,
    });

  let accessRestored = false;

  if (candidateCase.workingRepository) {
    if (!candidateCase.candidate.isActive) {
      throw new Error(
        "The candidate is inactive, so repository access cannot be restored.",
      );
    }

    if (!candidateCase.candidate.giteaIdentity?.login) {
      throw new Error(
        "The candidate no longer has a linked Gitea identity to restore access.",
      );
    }

    const settings = await getWorkspaceSettingsOrThrow();

    try {
      await grantRepositoryAccess({
        actorId: actor.actorId,
        owner: settings.giteaOrganization,
        repositoryName: candidateCase.workingRepository,
        username: candidateCase.candidate.giteaIdentity.login,
        permission: "write",
      });
      accessRestored = true;
    } catch (error) {
      if (error instanceof GiteaAdminClientError && error.status === 404) {
        throw new Error(
          "The archived repository is no longer available in Gitea, so this case cannot be restored automatically.",
        );
      }

      throw error;
    }
  }

  const restoredCandidateCase = await db.$transaction(async (transaction) => {
    if (accessRestored && candidateCase.workingRepository) {
      await transaction.candidateAccessGrant.create({
        data: {
          candidateCaseId: candidateCase.id,
          repositoryName: candidateCase.workingRepository,
          permissionKey: "write",
          canRead: true,
          canWrite: true,
          canOpenIssues: true,
          canOpenPullRequests: true,
        },
      });
    }

    return transaction.candidateCase.update({
      where: {
        id: candidateCase.id,
      },
      data: {
        status: restoreStatus,
        lastSyncedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
      },
    });
  });

  await createAuditLog({
    action: "candidate.case.restored",
    actorId: actor.actorId,
    resourceType: "CandidateCase",
    resourceId: candidateCase.id,
    detail: {
      candidateId: candidateCase.candidate.id,
      repositoryName: candidateCase.workingRepository,
      previousStatus: CandidateCaseStatus.ARCHIVED,
      nextStatus: restoredCandidateCase.status,
      accessRestored,
      templateId: candidateCase.caseTemplate.id,
      templateName: candidateCase.caseTemplate.name,
    },
  });

  return restoredCandidateCase;
}
