import {
  type CandidateCaseDecision,
  type CandidateCaseStatus,
  CandidateCaseStatus as CandidateCaseStatusValue,
  UserRole,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getWorkspaceSettings } from "@/lib/workspace-settings/queries";

export type CandidateCaseListItem = {
  id: string;
  status: CandidateCaseStatus;
  decision: CandidateCaseDecision | null;
  workingRepository: string | null;
  workingRepositoryUrl: string | null;
  branchName: string | null;
  dueAt: Date | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  candidateDisplayName: string;
  candidateEmail: string;
  candidateLogin: string | null;
  templateName: string;
  templateSlug: string;
  createdByName: string;
};

export type CandidateCaseAssignmentCandidateOption = {
  id: string;
  displayName: string;
  email: string;
  giteaLogin: string;
  caseCount: number;
};

export type CandidateCaseAssignmentTemplateOption = {
  id: string;
  name: string;
  slug: string;
  repositoryName: string;
  defaultBranch: string;
  assignmentCount: number;
};

export type CandidateCaseAssignmentOptions = {
  candidates: CandidateCaseAssignmentCandidateOption[];
  templates: CandidateCaseAssignmentTemplateOption[];
  workspaceOrganization: string | null;
};

export type CandidateWorkspaceCaseListItem = {
  id: string;
  status: CandidateCaseStatus;
  decision: CandidateCaseDecision | null;
  workingRepository: string | null;
  workingRepositoryUrl: string | null;
  branchName: string | null;
  dueAt: Date | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  reviewedAt: Date | null;
  templateName: string;
  templateSlug: string;
  templateSummary: string;
  createdByName: string;
  latestScore: number | null;
  latestSummary: string | null;
  latestReviewedAt: Date | null;
  latestReviewerName: string | null;
  notesCount: number;
};

export async function listCandidateCases() {
  const candidateCases = await db.candidateCase.findMany({
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
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return candidateCases.map<CandidateCaseListItem>((candidateCase) => ({
    id: candidateCase.id,
    status: candidateCase.status,
    decision: candidateCase.decision ?? null,
    workingRepository: candidateCase.workingRepository ?? null,
    workingRepositoryUrl: candidateCase.workingRepositoryUrl ?? null,
    branchName: candidateCase.branchName ?? null,
    dueAt: candidateCase.dueAt ?? null,
    startedAt: candidateCase.startedAt ?? null,
    submittedAt: candidateCase.submittedAt ?? null,
    lastSyncedAt: candidateCase.lastSyncedAt ?? null,
    createdAt: candidateCase.createdAt,
    candidateDisplayName:
      candidateCase.candidate.name ??
      candidateCase.candidate.email ??
      "Unnamed candidate",
    candidateEmail: candidateCase.candidate.email ?? "No email",
    candidateLogin: candidateCase.candidate.giteaIdentity?.login ?? null,
    templateName: candidateCase.caseTemplate.name,
    templateSlug: candidateCase.caseTemplate.slug,
    createdByName:
      candidateCase.createdBy.name ??
      candidateCase.createdBy.email ??
      "Unknown owner",
  }));
}

export async function getCandidateCaseAssignmentOptions(): Promise<CandidateCaseAssignmentOptions> {
  const [candidates, templates, workspaceSettings] = await Promise.all([
    db.user.findMany({
      where: {
        role: UserRole.CANDIDATE,
        isActive: true,
      },
      include: {
        giteaIdentity: {
          select: {
            login: true,
          },
        },
        _count: {
          select: {
            candidateCases: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.caseTemplate.findMany({
      include: {
        _count: {
          select: {
            candidateCases: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    getWorkspaceSettings(),
  ]);

  return {
    candidates: candidates
      .filter((candidate) => candidate.giteaIdentity?.login)
      .map<CandidateCaseAssignmentCandidateOption>((candidate) => ({
        id: candidate.id,
        displayName: candidate.name ?? candidate.email ?? "Unnamed candidate",
        email: candidate.email ?? "No email",
        giteaLogin: candidate.giteaIdentity?.login ?? "",
        caseCount: candidate._count.candidateCases,
      })),
    templates: templates.map<CandidateCaseAssignmentTemplateOption>(
      (template) => ({
        id: template.id,
        name: template.name,
        slug: template.slug,
        repositoryName: template.repositoryName,
        defaultBranch: template.defaultBranch,
        assignmentCount: template._count.candidateCases,
      }),
    ),
    workspaceOrganization: workspaceSettings?.giteaOrganization ?? null,
  };
}

export async function listCandidateWorkspaceCases(
  candidateId: string,
): Promise<CandidateWorkspaceCaseListItem[]> {
  const candidateCases = await db.candidateCase.findMany({
    where: {
      candidateId,
      status: {
        not: CandidateCaseStatusValue.ARCHIVED,
      },
    },
    include: {
      caseTemplate: {
        select: {
          name: true,
          slug: true,
          summary: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
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
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return candidateCases.map<CandidateWorkspaceCaseListItem>((candidateCase) => {
    const latestNote = candidateCase.evaluationNotes[0];

    return {
      id: candidateCase.id,
      status: candidateCase.status,
      decision: candidateCase.decision ?? null,
      workingRepository: candidateCase.workingRepository ?? null,
      workingRepositoryUrl: candidateCase.workingRepositoryUrl ?? null,
      branchName: candidateCase.branchName ?? null,
      dueAt: candidateCase.dueAt ?? null,
      startedAt: candidateCase.startedAt ?? null,
      submittedAt: candidateCase.submittedAt ?? null,
      lastSyncedAt: candidateCase.lastSyncedAt ?? null,
      createdAt: candidateCase.createdAt,
      reviewedAt: candidateCase.reviewedAt ?? null,
      templateName: candidateCase.caseTemplate.name,
      templateSlug: candidateCase.caseTemplate.slug,
      templateSummary: candidateCase.caseTemplate.summary,
      createdByName:
        candidateCase.createdBy.name ??
        candidateCase.createdBy.email ??
        "Unknown owner",
      latestScore: latestNote?.score ?? null,
      latestSummary: latestNote?.summary ?? null,
      latestReviewedAt: latestNote?.createdAt ?? null,
      latestReviewerName:
        latestNote?.author.name ?? latestNote?.author.email ?? null,
      notesCount: candidateCase._count.evaluationNotes,
    };
  });
}
