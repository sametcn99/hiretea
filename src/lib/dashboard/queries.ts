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

export type ManagementDashboardSummary = {
  kind: "management";
  candidateCount: number;
  templateCount: number;
  activeAssignmentCount: number;
  reviewQueueCount: number;
  completedReviewCount: number;
  webhookDeliveryCount: number;
};

export type DashboardSummary = ManagementDashboardSummary;

export async function getDashboardSummary(
  _role: UserRole,
  _userId: string,
): Promise<DashboardSummary> {
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
