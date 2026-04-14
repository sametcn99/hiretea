import { CandidateCaseStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";

const activeCandidateCaseStatuses = [
  CandidateCaseStatus.DRAFT,
  CandidateCaseStatus.PROVISIONING,
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
] as const;

const reviewQueueStatuses = [
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
] as const;

const candidateActiveStatuses = [
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
] as const;

export type ManagementDashboardSummary = {
  kind: "management";
  candidateCount: number;
  templateCount: number;
  activeAssignmentCount: number;
  reviewQueueCount: number;
  completedReviewCount: number;
  webhookDeliveryCount: number;
};

export type CandidateDashboardSummary = {
  kind: "candidate";
  assignedCaseCount: number;
  repositoryCount: number;
  activeCaseCount: number;
  completedCaseCount: number;
  decidedCaseCount: number;
};

export type DashboardSummary =
  | ManagementDashboardSummary
  | CandidateDashboardSummary;

export async function getDashboardSummary(
  role: UserRole,
  userId: string,
): Promise<DashboardSummary> {
  if (role === UserRole.CANDIDATE) {
    const [
      assignedCaseCount,
      repositoryCount,
      activeCaseCount,
      completedCaseCount,
      decidedCaseCount,
    ] = await Promise.all([
      db.candidateCase.count({
        where: {
          candidateId: userId,
        },
      }),
      db.candidateCase.count({
        where: {
          candidateId: userId,
          workingRepositoryUrl: {
            not: null,
          },
        },
      }),
      db.candidateCase.count({
        where: {
          candidateId: userId,
          status: {
            in: [...candidateActiveStatuses],
          },
        },
      }),
      db.candidateCase.count({
        where: {
          candidateId: userId,
          status: CandidateCaseStatus.COMPLETED,
        },
      }),
      db.candidateCase.count({
        where: {
          candidateId: userId,
          decision: {
            not: null,
          },
        },
      }),
    ]);

    return {
      kind: "candidate",
      assignedCaseCount,
      repositoryCount,
      activeCaseCount,
      completedCaseCount,
      decidedCaseCount,
    };
  }

  const [
    candidateCount,
    templateCount,
    activeAssignmentCount,
    reviewQueueCount,
    completedReviewCount,
    webhookDeliveryCount,
  ] = await Promise.all([
    db.user.count({
      where: {
        role: UserRole.CANDIDATE,
        isActive: true,
      },
    }),
    db.caseTemplate.count(),
    db.candidateCase.count({
      where: {
        status: {
          in: [...activeCandidateCaseStatuses],
        },
      },
    }),
    db.candidateCase.count({
      where: {
        status: {
          in: [...reviewQueueStatuses],
        },
      },
    }),
    db.candidateCase.count({
      where: {
        status: CandidateCaseStatus.COMPLETED,
      },
    }),
    db.webhookDelivery.count(),
  ]);

  return {
    kind: "management",
    candidateCount,
    templateCount,
    activeAssignmentCount,
    reviewQueueCount,
    completedReviewCount,
    webhookDeliveryCount,
  };
}
