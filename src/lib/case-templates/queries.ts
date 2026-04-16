import { db } from "@/lib/db";

export type CaseTemplateListItem = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  repositoryName: string;
  repositoryDescription: string | null;
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
  hasTemplateReviewGuide: boolean;
  createdAt: Date;
  createdByName: string;
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
            take: 3,
            select: {
              id: true,
              title: true,
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
    repositoryName: template.repositoryName,
    repositoryDescription: template.repositoryDescription ?? null,
    defaultBranch: template.defaultBranch,
    candidateCaseCount: template._count.candidateCases,
    reviewerInstructions: template.reviewGuide?.reviewerInstructions ?? null,
    decisionGuidance: template.reviewGuide?.decisionGuidance ?? null,
    rubricCriteriaCount: template.reviewGuide?._count.rubricCriteria ?? 0,
    rubricCriteriaPreview: template.reviewGuide?.rubricCriteria ?? [],
    hasTemplateReviewGuide: Boolean(template.reviewGuide),
    createdAt: template.createdAt,
    createdByName:
      template.createdBy.name ?? template.createdBy.email ?? "Unknown owner",
  }));
}
