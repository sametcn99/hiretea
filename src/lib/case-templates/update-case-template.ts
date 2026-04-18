import { createAuditLog } from "@/lib/audit/log";
import type { CaseTemplateUpdateInput } from "@/lib/case-templates/schemas";
import { db } from "@/lib/db";

type UpdateCaseTemplateParams = CaseTemplateUpdateInput & {
  actorId: string;
  templateId: string;
};

export async function updateCaseTemplate(input: UpdateCaseTemplateParams) {
  const hasTemplateReviewGuide =
    Boolean(input.reviewerInstructions) ||
    Boolean(input.decisionGuidance) ||
    input.rubricCriteria.length > 0;

  const [existingTemplate, conflictingTemplate, reviewers] = await Promise.all([
    db.caseTemplate.findUnique({
      where: {
        id: input.templateId,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        repositoryOwner: true,
        repositoryName: true,
        repositoryDescription: true,
        repositorySourceKind: true,
        sourceRepositoryOwner: true,
        sourceRepositoryName: true,
        defaultBranch: true,
        reviewGuide: {
          select: {
            id: true,
          },
        },
      },
    }),
    db.caseTemplate.findFirst({
      where: {
        id: {
          not: input.templateId,
        },
        slug: input.slug,
      },
      select: {
        id: true,
      },
    }),
    db.user.findMany({
      where: {
        id: {
          in: input.reviewerIds,
        },
        role: "RECRUITER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  if (!existingTemplate) {
    throw new Error("The case template could not be found.");
  }

  if (conflictingTemplate) {
    throw new Error(
      "A case template with the same slug or repository name already exists.",
    );
  }

  if (reviewers.length !== input.reviewerIds.length) {
    throw new Error(
      "One or more selected template reviewers are invalid or no longer active.",
    );
  }

  const template = await db.caseTemplate.update({
    where: {
      id: input.templateId,
    },
    data: {
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      reviewerAssignments: {
        deleteMany: {},
        create: input.reviewerIds.map((reviewerId) => ({
          reviewerId,
          assignedById: input.actorId,
        })),
      },
      reviewGuide: hasTemplateReviewGuide
        ? {
            upsert: {
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
              update: {
                reviewerInstructions: input.reviewerInstructions,
                decisionGuidance: input.decisionGuidance,
                rubricCriteria: {
                  deleteMany: {},
                  create: input.rubricCriteria.map((criterion, index) => ({
                    title: criterion.title,
                    description: criterion.description,
                    weight: criterion.weight,
                    sortOrder: index,
                  })),
                },
              },
            },
          }
        : existingTemplate.reviewGuide
          ? {
              delete: true,
            }
          : undefined,
    },
    include: {
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
      reviewGuide: {
        select: {
          id: true,
          _count: {
            select: {
              rubricCriteria: true,
            },
          },
        },
      },
    },
  });

  await createAuditLog({
    action: "case.template.updated",
    actorId: input.actorId,
    resourceType: "CaseTemplate",
    resourceId: template.id,
    detail: {
      previousName: existingTemplate.name,
      nextName: template.name,
      previousSlug: existingTemplate.slug,
      nextSlug: template.slug,
      repositoryOwner: existingTemplate.repositoryOwner,
      repositoryName: existingTemplate.repositoryName,
      repositorySourceKind: existingTemplate.repositorySourceKind,
      sourceRepositoryOwner: existingTemplate.sourceRepositoryOwner,
      sourceRepositoryName: existingTemplate.sourceRepositoryName,
      rubricCriteriaCount: template.reviewGuide?._count.rubricCriteria ?? 0,
      hasTemplateReviewGuide,
      defaultReviewerNames: template.reviewerAssignments.map(
        (assignment) =>
          assignment.reviewer.name ??
          assignment.reviewer.email ??
          "Unknown reviewer",
      ),
    },
  });

  return template;
}
