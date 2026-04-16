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
  const hasTemplateReviewGuide =
    Boolean(input.reviewerInstructions) ||
    Boolean(input.decisionGuidance) ||
    input.rubricCriteria.length > 0;

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
        reviewGuide: hasTemplateReviewGuide
          ? {
              create: {
                reviewerInstructions: input.reviewerInstructions,
                decisionGuidance: input.decisionGuidance,
                rubricCriteria: input.rubricCriteria.length
                  ? {
                      create: input.rubricCriteria.map((criterion, index) => ({
                        title: criterion.title,
                        description: criterion.description,
                        weight: criterion.weight,
                        sortOrder: index,
                      })),
                    }
                  : undefined,
              },
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        reviewGuide: {
          select: {
            id: true,
            reviewerInstructions: true,
            decisionGuidance: true,
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
    });

    await createAuditLog({
      action: "case.template.created",
      actorId: input.actorId,
      resourceType: "CaseTemplate",
      resourceId: template.id,
      detail: {
        slug: template.slug,
        repositoryName: template.repositoryName,
        hasTemplateReviewGuide,
        rubricCriteriaCount: template.reviewGuide?._count.rubricCriteria ?? 0,
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
