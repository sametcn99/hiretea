import { createAuditLog } from "@/lib/audit/log";
import type { CaseTemplateUpdateInput } from "@/lib/case-templates/schemas";
import { db } from "@/lib/db";
import { getGiteaAdminClient } from "@/lib/gitea/client";
import { getResolvedGiteaAdminConfig } from "@/lib/gitea/runtime-config";

type UpdateCaseTemplateParams = CaseTemplateUpdateInput & {
  actorId: string;
  templateId: string;
};

export async function updateCaseTemplate(input: UpdateCaseTemplateParams) {
  const hasTemplateReviewGuide =
    Boolean(input.reviewerInstructions) ||
    Boolean(input.decisionGuidance) ||
    input.rubricCriteria.length > 0;

  const [
    client,
    adminConfig,
    existingTemplate,
    conflictingTemplate,
    reviewers,
  ] = await Promise.all([
    getGiteaAdminClient(),
    getResolvedGiteaAdminConfig(),
    db.caseTemplate.findUnique({
      where: {
        id: input.templateId,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        repositoryName: true,
        repositoryDescription: true,
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

  const organizationName = adminConfig.organization;

  if (!organizationName) {
    throw new Error(
      "A Gitea organization name is required to update case templates.",
    );
  }

  const nextRepositoryDescription =
    input.repositoryDescription ?? input.summary;
  const previousRepositoryDescription =
    existingTemplate.repositoryDescription ?? existingTemplate.summary;
  const repositoryPatchTarget =
    input.repositoryName !== existingTemplate.repositoryName
      ? input.repositoryName
      : existingTemplate.repositoryName;

  await client.editRepository(
    organizationName,
    existingTemplate.repositoryName,
    {
      name:
        input.repositoryName !== existingTemplate.repositoryName
          ? input.repositoryName
          : undefined,
      description: nextRepositoryDescription,
      default_branch: input.defaultBranch,
    },
  );

  try {
    const template = await db.caseTemplate.update({
      where: {
        id: input.templateId,
      },
      data: {
        slug: input.slug,
        name: input.name,
        summary: input.summary,
        repositoryName: input.repositoryName,
        repositoryDescription: input.repositoryDescription,
        defaultBranch: input.defaultBranch,
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
                        create: input.rubricCriteria.map(
                          (criterion, index) => ({
                            title: criterion.title,
                            description: criterion.description,
                            weight: criterion.weight,
                            sortOrder: index,
                          }),
                        ),
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
        previousRepositoryName: existingTemplate.repositoryName,
        nextRepositoryName: template.repositoryName,
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
  } catch (error) {
    await client
      .editRepository(organizationName, repositoryPatchTarget, {
        name:
          input.repositoryName !== existingTemplate.repositoryName
            ? existingTemplate.repositoryName
            : undefined,
        description: previousRepositoryDescription,
        default_branch: existingTemplate.defaultBranch,
      })
      .catch(() => undefined);

    throw error;
  }
}
