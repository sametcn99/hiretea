import {
  type CandidateCaseDecision,
  CandidateCaseStatus,
  type CandidateCaseStatus as CandidateCaseStatusType,
  UserRole,
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
  assignedReviewerNames: string[];
};

export type ReviewCaseHistoryItem = {
  id: string;
  score: number | null;
  summary: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
};

export type ReviewCaseDetail = ReviewCaseListItem & {
  reviewHistory: ReviewCaseHistoryItem[];
};

type ReviewCaseActorInput = {
  actorId: string;
  actorRole: UserRole;
};

function buildReviewCaseWhereClause(input?: ReviewCaseActorInput) {
  return {
    ...(input?.actorRole === UserRole.RECRUITER
      ? {
          OR: [
            {
              reviewerAssignments: {
                some: {
                  reviewerId: input.actorId,
                },
              },
            },
            {
              reviewerAssignments: {
                none: {},
              },
            },
          ],
        }
      : {}),
    status: {
      in: [
        CandidateCaseStatus.READY,
        CandidateCaseStatus.IN_PROGRESS,
        CandidateCaseStatus.REVIEWING,
        CandidateCaseStatus.COMPLETED,
      ],
    },
  };
}

function mapReviewCase(candidateCase: {
  id: string;
  status: CandidateCaseStatusType;
  decision: CandidateCaseDecision | null;
  workingRepository: string | null;
  workingRepositoryUrl: string | null;
  dueAt: Date | null;
  reviewedAt: Date | null;
  candidate: {
    name: string | null;
    email: string | null;
    giteaIdentity: {
      login: string;
    } | null;
  };
  caseTemplate: {
    name: string;
    slug: string;
    reviewGuide: {
      _count: {
        rubricCriteria: number;
      };
    } | null;
  };
  evaluationNotes: Array<{
    id: string;
    score: number | null;
    summary: string;
    note?: string | null;
    createdAt: Date;
    updatedAt?: Date;
    author: {
      name: string | null;
      email: string | null;
    };
  }>;
  _count: {
    evaluationNotes: number;
  };
  reviewerAssignments: Array<{
    reviewer: {
      name: string | null;
      email: string | null;
    };
  }>;
}): ReviewCaseListItem {
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
    assignedReviewerNames: candidateCase.reviewerAssignments.map(
      (assignment) =>
        assignment.reviewer.name ??
        assignment.reviewer.email ??
        "Unknown reviewer",
    ),
  };
}

export async function listReviewCases(input?: {
  actorId: string;
  actorRole: UserRole;
}) {
  const candidateCases = await db.candidateCase.findMany({
    where: buildReviewCaseWhereClause(input),
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
          id: true,
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
      reviewerAssignments: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          reviewer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return candidateCases.map<ReviewCaseListItem>(mapReviewCase);
}

export async function getReviewCaseById(
  input: ReviewCaseActorInput & {
    candidateCaseId: string;
  },
) {
  const candidateCase = await db.candidateCase.findFirst({
    where: {
      id: input.candidateCaseId,
      ...buildReviewCaseWhereClause(input),
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
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          score: true,
          summary: true,
          note: true,
          createdAt: true,
          updatedAt: true,
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
      reviewerAssignments: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
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

  if (!candidateCase) {
    return null;
  }

  return {
    ...mapReviewCase(candidateCase),
    reviewHistory: candidateCase.evaluationNotes.map((note) => ({
      id: note.id,
      score: note.score ?? null,
      summary: note.summary,
      note: note.note ?? null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      authorName: note.author.name ?? note.author.email ?? "Unknown reviewer",
    })),
  } satisfies ReviewCaseDetail;
}
