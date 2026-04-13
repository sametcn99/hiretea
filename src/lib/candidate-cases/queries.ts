import {
  type CandidateCaseDecision,
  type CandidateCaseStatus,
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
