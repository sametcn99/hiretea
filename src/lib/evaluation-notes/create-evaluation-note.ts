import {
  type CandidateCaseDecision,
  CandidateCaseStatus,
} from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import type { EvaluationNoteCreateInput } from "@/lib/evaluation-notes/schemas";

type CreateEvaluationNoteParams = EvaluationNoteCreateInput & {
  actorId: string;
};

const reviewableStatuses: CandidateCaseStatus[] = [
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
  CandidateCaseStatus.COMPLETED,
];

function getNextStatus(
  currentStatus: CandidateCaseStatus,
  finalizeReview: boolean,
) {
  if (finalizeReview) {
    return CandidateCaseStatus.COMPLETED;
  }

  if (currentStatus === CandidateCaseStatus.COMPLETED) {
    return CandidateCaseStatus.COMPLETED;
  }

  return CandidateCaseStatus.REVIEWING;
}

function getNextDecision(
  currentDecision: CandidateCaseDecision | null,
  finalizeReview: boolean,
  inputDecision: CandidateCaseDecision | undefined,
) {
  if (finalizeReview) {
    return inputDecision ?? null;
  }

  return currentDecision;
}

export async function createEvaluationNote(input: CreateEvaluationNoteParams) {
  const candidateCase = await db.candidateCase.findUnique({
    where: {
      id: input.candidateCaseId,
    },
    select: {
      id: true,
      status: true,
      decision: true,
      reviewedAt: true,
      candidate: {
        select: {
          name: true,
          email: true,
        },
      },
      caseTemplate: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!candidateCase) {
    throw new Error("The selected candidate case does not exist.");
  }

  if (!reviewableStatuses.includes(candidateCase.status)) {
    throw new Error("The selected candidate case is not ready for review yet.");
  }

  const nextStatus = getNextStatus(candidateCase.status, input.finalizeReview);
  const nextDecision = getNextDecision(
    candidateCase.decision,
    input.finalizeReview,
    input.decision,
  );
  const reviewedAt = input.finalizeReview
    ? new Date()
    : candidateCase.reviewedAt;

  return db.$transaction(async (transaction) => {
    const note = await transaction.evaluationNote.create({
      data: {
        candidateCaseId: candidateCase.id,
        authorId: input.actorId,
        score: input.score,
        summary: input.summary,
        note: input.note,
      },
      select: {
        id: true,
        score: true,
        summary: true,
        createdAt: true,
      },
    });

    const updatedCandidateCase = await transaction.candidateCase.update({
      where: {
        id: candidateCase.id,
      },
      data: {
        status: nextStatus,
        decision: nextDecision,
        reviewedAt,
      },
      select: {
        id: true,
        status: true,
        decision: true,
        reviewedAt: true,
        candidate: {
          select: {
            name: true,
            email: true,
          },
        },
        caseTemplate: {
          select: {
            name: true,
          },
        },
      },
    });

    await createAuditLog({
      action: input.finalizeReview
        ? "candidate.case.review.completed"
        : "candidate.case.review.recorded",
      actorId: input.actorId,
      resourceType: "CandidateCase",
      resourceId: candidateCase.id,
      detail: {
        score: input.score,
        summary: input.summary,
        decision: nextDecision,
        status: nextStatus,
      },
    });

    return {
      note,
      candidateCase: updatedCandidateCase,
    };
  });
}
