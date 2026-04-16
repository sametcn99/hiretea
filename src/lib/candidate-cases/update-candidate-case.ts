import { CandidateCaseStatus, UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import {
  type AuthorizedActor,
  assertInternalOperator,
} from "@/lib/auth/authorization";
import type { CandidateCaseUpdateInput } from "@/lib/candidate-cases/schemas";
import { db } from "@/lib/db";
import {
  grantRepositoryAccess,
  revokeRepositoryAccess,
} from "@/lib/gitea/permissions";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";

type UpdateCandidateCaseParams = CandidateCaseUpdateInput &
  AuthorizedActor & {
    caseId: string;
  };

const activeCandidateCaseStatuses = [
  CandidateCaseStatus.DRAFT,
  CandidateCaseStatus.PROVISIONING,
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
] as const;

export async function updateCandidateCase(input: UpdateCandidateCaseParams) {
  assertInternalOperator(input, "update candidate cases");

  const [caseRecord, candidate, template, reviewers, conflictingCase] =
    await Promise.all([
      db.candidateCase.findUnique({
        where: { id: input.caseId },
        select: {
          id: true,
          candidateId: true,
          caseTemplateId: true,
          status: true,
          dueAt: true,
          workingRepository: true,
          reviewerAssignments: {
            select: {
              reviewerId: true,
              reviewer: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
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
              slug: true,
            },
          },
        },
      }),
      db.user.findUnique({
        where: { id: input.candidateId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          giteaIdentity: {
            select: {
              login: true,
            },
          },
        },
      }),
      db.caseTemplate.findUnique({
        where: { id: input.caseTemplateId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      db.user.findMany({
        where: {
          id: {
            in: input.reviewerIds,
          },
          role: UserRole.RECRUITER,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
      db.candidateCase.findFirst({
        where: {
          id: {
            not: input.caseId,
          },
          candidateId: input.candidateId,
          caseTemplateId: input.caseTemplateId,
          status: {
            in: [...activeCandidateCaseStatuses],
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

  if (!caseRecord) {
    throw new Error("The selected candidate case does not exist.");
  }

  if (!candidate || candidate.role !== UserRole.CANDIDATE) {
    throw new Error("The selected candidate does not exist.");
  }

  if (!candidate.isActive) {
    throw new Error("Only active candidates can keep case assignments.");
  }

  if (!candidate.giteaIdentity?.login) {
    throw new Error(
      "The selected candidate does not have a linked Gitea identity yet.",
    );
  }

  if (!template) {
    throw new Error("The selected case template does not exist.");
  }

  if (reviewers.length !== input.reviewerIds.length) {
    throw new Error(
      "One or more selected reviewers are invalid or no longer active.",
    );
  }

  if (conflictingCase) {
    throw new Error(
      "This candidate already has an active assignment for the selected template.",
    );
  }

  const candidateChanged = caseRecord.candidateId !== candidate.id;
  const accessShouldBeUpdated =
    candidateChanged &&
    Boolean(caseRecord.workingRepository) &&
    caseRecord.status !== CandidateCaseStatus.ARCHIVED;
  const currentCandidateLogin = caseRecord.candidate.giteaIdentity?.login;
  const nextCandidateLogin = candidate.giteaIdentity.login;
  let accessGrantedToNextCandidate = false;

  try {
    if (accessShouldBeUpdated && caseRecord.workingRepository) {
      const settings = await getWorkspaceSettingsOrThrow();

      await grantRepositoryAccess({
        actorId: input.actorId,
        owner: settings.giteaOrganization,
        repositoryName: caseRecord.workingRepository,
        username: nextCandidateLogin,
        permission: "write",
      });
      accessGrantedToNextCandidate = true;
    }

    const updatedCase = await db.$transaction(async (transaction) => {
      const now = new Date();

      if (accessShouldBeUpdated && caseRecord.workingRepository) {
        await transaction.candidateAccessGrant.updateMany({
          where: {
            candidateCaseId: caseRecord.id,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        await transaction.candidateAccessGrant.create({
          data: {
            candidateCaseId: caseRecord.id,
            repositoryName: caseRecord.workingRepository,
            permissionKey: "write",
            canRead: true,
            canWrite: true,
            canOpenIssues: true,
            canOpenPullRequests: true,
          },
        });
      }

      await transaction.candidateCaseReviewerAssignment.deleteMany({
        where: {
          candidateCaseId: caseRecord.id,
        },
      });

      const updated = await transaction.candidateCase.update({
        where: {
          id: caseRecord.id,
        },
        data: {
          candidateId: candidate.id,
          caseTemplateId: template.id,
          dueAt: input.dueAt ?? null,
          reviewerAssignments: {
            create: reviewers.map((reviewer) => ({
              reviewerId: reviewer.id,
              assignedById: input.actorId,
            })),
          },
        },
        select: {
          id: true,
          dueAt: true,
          workingRepository: true,
          candidate: {
            select: {
              name: true,
              email: true,
            },
          },
          caseTemplate: {
            select: {
              name: true,
              slug: true,
            },
          },
          reviewerAssignments: {
            select: {
              reviewerId: true,
              reviewer: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      await createAuditLog({
        action: "candidate.case.updated",
        actorId: input.actorId,
        resourceType: "CandidateCase",
        resourceId: caseRecord.id,
        detail: {
          previous: {
            candidateId: caseRecord.candidateId,
            candidateLogin: currentCandidateLogin ?? null,
            caseTemplateId: caseRecord.caseTemplateId,
            caseTemplateSlug: caseRecord.caseTemplate.slug,
            dueAt: caseRecord.dueAt?.toISOString() ?? null,
            reviewerIds: caseRecord.reviewerAssignments.map(
              (assignment) => assignment.reviewerId,
            ),
            reviewerNames: caseRecord.reviewerAssignments.map(
              (assignment) =>
                assignment.reviewer.name ??
                assignment.reviewer.email ??
                "Unknown reviewer",
            ),
          },
          next: {
            candidateId: candidate.id,
            candidateLogin: nextCandidateLogin,
            caseTemplateId: template.id,
            caseTemplateSlug: template.slug,
            dueAt: input.dueAt?.toISOString() ?? null,
            reviewerIds: reviewers.map((reviewer) => reviewer.id),
            reviewerNames: reviewers.map(
              (reviewer) =>
                reviewer.name ?? reviewer.email ?? "Unknown reviewer",
            ),
          },
          repositoryName: caseRecord.workingRepository,
          accessReassigned: accessShouldBeUpdated,
        },
      });

      return updated;
    });

    if (
      accessShouldBeUpdated &&
      caseRecord.workingRepository &&
      currentCandidateLogin
    ) {
      const settings = await getWorkspaceSettingsOrThrow();

      await revokeRepositoryAccess({
        actorId: input.actorId,
        owner: settings.giteaOrganization,
        repositoryName: caseRecord.workingRepository,
        username: currentCandidateLogin,
      });
    }

    return updatedCase;
  } catch (error) {
    if (accessGrantedToNextCandidate && caseRecord.workingRepository) {
      const settings = await getWorkspaceSettingsOrThrow();

      await revokeRepositoryAccess({
        actorId: input.actorId,
        owner: settings.giteaOrganization,
        repositoryName: caseRecord.workingRepository,
        username: nextCandidateLogin,
      }).catch(() => undefined);
    }

    throw error;
  }
}
