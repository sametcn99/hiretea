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
    createdAt: template.createdAt,
    createdByName:
      template.createdBy.name ?? template.createdBy.email ?? "Unknown owner",
  }));
}
