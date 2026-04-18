import type { CaseTemplateRepositorySourceKind } from "@prisma/client";
import { formatRubricCriteriaInput } from "@/app/(app)/dashboard/case-templates/components/case-template-form-helpers";
import { db } from "@/lib/db";
import { getGiteaAdminClient } from "@/lib/gitea/client";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";

export type CaseTemplateListItem = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  repositoryOwner: string;
  repositoryName: string;
  repositoryDescription: string | null;
  repositorySourceKind: CaseTemplateRepositorySourceKind;
  sourceRepositoryOwner: string | null;
  sourceRepositoryName: string | null;
  defaultBranch: string;
  candidateCaseCount: number;
  reviewerInstructions: string | null;
  decisionGuidance: string | null;
  rubricCriteriaCount: number;
  rubricCriteriaPreview: Array<{
    id: string;
    title: string;
    weight: number | null;
  }>;
  rubricCriteriaInput: string;
  defaultReviewerIds: string[];
  defaultReviewerNames: string[];
  hasTemplateReviewGuide: boolean;
  createdAt: Date;
  createdByName: string;
};

export type CaseTemplateReviewerOption = {
  id: string;
  displayName: string;
  email: string;
};

export type CaseTemplateSourceRepositoryOption = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
};

export async function listCaseTemplates() {
  const templates = await db.caseTemplate.findMany({
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      reviewGuide: {
        select: {
          reviewerInstructions: true,
          decisionGuidance: true,
          rubricCriteria: {
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              title: true,
              description: true,
              weight: true,
            },
          },
          _count: {
            select: {
              rubricCriteria: true,
            },
          },
        },
      },
      reviewerAssignments: {
        orderBy: {
          createdAt: "asc",
        },
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
      _count: {
        select: {
          candidateCases: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return templates.map<CaseTemplateListItem>((template) => ({
    id: template.id,
    name: template.name,
    slug: template.slug,
    summary: template.summary,
    repositoryOwner: template.repositoryOwner,
    repositoryName: template.repositoryName,
    repositoryDescription: template.repositoryDescription ?? null,
    repositorySourceKind: template.repositorySourceKind,
    sourceRepositoryOwner: template.sourceRepositoryOwner ?? null,
    sourceRepositoryName: template.sourceRepositoryName ?? null,
    defaultBranch: template.defaultBranch,
    candidateCaseCount: template._count.candidateCases,
    reviewerInstructions: template.reviewGuide?.reviewerInstructions ?? null,
    decisionGuidance: template.reviewGuide?.decisionGuidance ?? null,
    rubricCriteriaCount: template.reviewGuide?._count.rubricCriteria ?? 0,
    rubricCriteriaPreview:
      template.reviewGuide?.rubricCriteria.slice(0, 3) ?? [],
    rubricCriteriaInput: formatRubricCriteriaInput(
      template.reviewGuide?.rubricCriteria ?? [],
    ),
    defaultReviewerIds: template.reviewerAssignments.map(
      (assignment) => assignment.reviewerId,
    ),
    defaultReviewerNames: template.reviewerAssignments.map(
      (assignment) =>
        assignment.reviewer.name ??
        assignment.reviewer.email ??
        "Unknown reviewer",
    ),
    hasTemplateReviewGuide: Boolean(template.reviewGuide),
    createdAt: template.createdAt,
    createdByName:
      template.createdBy.name ?? template.createdBy.email ?? "Unknown owner",
  }));
}

export async function listCaseTemplateReviewerOptions(): Promise<
  CaseTemplateReviewerOption[]
> {
  const reviewers = await db.user.findMany({
    where: {
      role: "RECRUITER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviewers.map((reviewer) => ({
    id: reviewer.id,
    displayName: reviewer.name ?? reviewer.email ?? "Unnamed reviewer",
    email: reviewer.email ?? "No email",
  }));
}

export async function listCaseTemplateSourceRepositories(): Promise<
  CaseTemplateSourceRepositoryOption[]
> {
  const [settings, client] = await Promise.all([
    getWorkspaceSettingsOrThrow(),
    getGiteaAdminClient(),
  ]);
  const repositories = await client.listOrganizationRepositories(
    settings.giteaOrganization,
    {
      limit: 100,
    },
  );

  return repositories
    .filter((repository) => !repository.archived)
    .map((repository) => ({
      id: repository.full_name,
      name: repository.name,
      fullName: repository.full_name,
      owner:
        repository.owner?.login ??
        repository.owner?.username ??
        settings.giteaOrganization,
      description: repository.description ?? null,
      defaultBranch: repository.default_branch ?? "main",
      isPrivate: Boolean(repository.private),
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "en"));
}
