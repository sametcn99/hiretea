import type {
  CandidateCaseDecision,
  CandidateCaseStatus,
} from "@prisma/client";
import type {
  CandidateCaseDetail,
  CandidateCaseListItem,
} from "@/lib/candidate-cases/queries";

export const candidateCaseStatusToneMap: Record<
  CandidateCaseStatus,
  "info" | "neutral" | "positive" | "warning"
> = {
  DRAFT: "neutral",
  PROVISIONING: "info",
  READY: "positive",
  IN_PROGRESS: "info",
  REVIEWING: "warning",
  COMPLETED: "positive",
  ARCHIVED: "neutral",
};

export const candidateCaseDecisionToneMap: Record<
  CandidateCaseDecision,
  "neutral" | "positive" | "warning"
> = {
  ADVANCE: "positive",
  HOLD: "neutral",
  REJECT: "warning",
};

const reviewWorkflowEligibleStatuses = new Set<CandidateCaseStatus>([
  "READY",
  "IN_PROGRESS",
  "REVIEWING",
  "COMPLETED",
]);

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type CandidateCaseNavigation = {
  previousCandidateCase: CandidateCaseListItem | null;
  nextCandidateCase: CandidateCaseListItem | null;
  currentPosition: number | null;
  totalCount: number;
};

export function getCandidateCaseNavigation(
  candidateCaseId: CandidateCaseDetail["id"],
  candidateCases: CandidateCaseListItem[],
): CandidateCaseNavigation {
  const currentIndex = candidateCases.findIndex(
    (candidateCase) => candidateCase.id === candidateCaseId,
  );

  return {
    previousCandidateCase:
      currentIndex > 0 ? candidateCases[currentIndex - 1] : null,
    nextCandidateCase:
      currentIndex >= 0 && currentIndex < candidateCases.length - 1
        ? candidateCases[currentIndex + 1]
        : null,
    currentPosition: currentIndex >= 0 ? currentIndex + 1 : null,
    totalCount: candidateCases.length,
  };
}

export function canOpenCandidateCaseReviewWorkflow(
  candidateCase: Pick<
    CandidateCaseDetail,
    "status" | "candidateCompletionRequestedAt"
  >,
) {
  return (
    reviewWorkflowEligibleStatuses.has(candidateCase.status) &&
    candidateCase.candidateCompletionRequestedAt !== null
  );
}

export function formatCandidateCaseDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "Not available yet";
}

export function formatCandidateCaseAuditDetail(detail: unknown) {
  if (!detail) {
    return "No additional detail";
  }

  return JSON.stringify(detail, null, 2);
}
