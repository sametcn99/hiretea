import {
  type CandidateCaseDecision,
  CandidateCaseStatus,
  type CandidateCaseStatus as CandidateCaseStatusType,
} from "@prisma/client";
import { db } from "@/lib/db";

export type ReviewCaseListItem = {
  id: string;
  status: CandidateCaseStatusType;
  decision: CandidateCaseDecision | null;
  workingRepository: string | null;
  workingRepositoryUrl: string | null;
  dueAt: Date | null;
  reviewedAt: Date | null;
  candidateDisplayName: string;
  candidateEmail: string;
  candidateLogin: string | null;
  templateName: string;
  templateSlug: string;
  hasTemplateReviewGuide: boolean;
  rubricCriteriaCount: number;
  latestScore: number | null;
  latestSummary: string | null;
  latestReviewedAt: Date | null;
  latestReviewerName: string | null;
  notesCount: number;
};

export async function listReviewCases() {
  const candidateCases = await db.candidateCase.findMany({
    where: {
      status: {
        in: [
          CandidateCaseStatus.READY,
          CandidateCaseStatus.IN_PROGRESS,
          CandidateCaseStatus.REVIEWING,
          CandidateCaseStatus.COMPLETED,
        ],
      },
    },
    include: {
      candidate: {
        select: {
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
          name: true,
          slug: true,
          reviewGuide: {
            select: {
              _count: {
                select: {
                  rubricCriteria: true,
                },
              },
            },
          },
        },
      },
      evaluationNotes: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          score: true,
          summary: true,
          createdAt: true,
          author: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          evaluationNotes: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return candidateCases.map<ReviewCaseListItem>((candidateCase) => {
    const latestNote = candidateCase.evaluationNotes[0];

    return {
      id: candidateCase.id,
      status: candidateCase.status,
      decision: candidateCase.decision ?? null,
      workingRepository: candidateCase.workingRepository ?? null,
      workingRepositoryUrl: candidateCase.workingRepositoryUrl ?? null,
      dueAt: candidateCase.dueAt ?? null,
      reviewedAt: candidateCase.reviewedAt ?? null,
      candidateDisplayName:
        candidateCase.candidate.name ??
        candidateCase.candidate.email ??
        "Unnamed candidate",
      candidateEmail: candidateCase.candidate.email ?? "No email",
      candidateLogin: candidateCase.candidate.giteaIdentity?.login ?? null,
      templateName: candidateCase.caseTemplate.name,
      templateSlug: candidateCase.caseTemplate.slug,
      hasTemplateReviewGuide: Boolean(candidateCase.caseTemplate.reviewGuide),
      rubricCriteriaCount:
        candidateCase.caseTemplate.reviewGuide?._count.rubricCriteria ?? 0,
      latestScore: latestNote?.score ?? null,
      latestSummary: latestNote?.summary ?? null,
      latestReviewedAt: latestNote?.createdAt ?? null,
      latestReviewerName:
        latestNote?.author.name ?? latestNote?.author.email ?? null,
      notesCount: candidateCase._count.evaluationNotes,
    };
  });
}
