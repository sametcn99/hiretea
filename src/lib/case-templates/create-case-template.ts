import { createAuditLog } from "@/lib/audit/log";
import type { CaseTemplateCreateInput } from "@/lib/case-templates/schemas";
import { db } from "@/lib/db";
import {
  createCaseRepository,
  deleteCaseRepository,
} from "@/lib/gitea/repositories";

type CreateCaseTemplateParams = CaseTemplateCreateInput & {
  actorId: string;
};

export async function createCaseTemplate(input: CreateCaseTemplateParams) {
  const existingTemplate = await db.caseTemplate.findFirst({
    where: {
      OR: [
        {
          slug: input.slug,
        },
        {
          repositoryName: input.repositoryName,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existingTemplate) {
    throw new Error(
      "A case template with the same slug or repository name already exists.",
    );
  }

  await createCaseRepository({
    actorId: input.actorId,
    name: input.repositoryName,
    description: input.repositoryDescription ?? input.summary,
    defaultBranch: input.defaultBranch,
  });

  try {
    const template = await db.caseTemplate.create({
      data: {
        slug: input.slug,
        name: input.name,
        summary: input.summary,
        repositoryName: input.repositoryName,
        repositoryDescription: input.repositoryDescription,
        defaultBranch: input.defaultBranch,
        createdById: input.actorId,
      },
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
    });

    await createAuditLog({
      action: "case.template.created",
      actorId: input.actorId,
      resourceType: "CaseTemplate",
      resourceId: template.id,
      detail: {
        slug: template.slug,
        repositoryName: template.repositoryName,
      },
    });

    return template;
  } catch (error) {
    await deleteCaseRepository({
      actorId: input.actorId,
      repositoryName: input.repositoryName,
      reason: "case.repository.rollback",
    });

    throw error;
  }
}
