import { CaseTemplateRepositorySourceKind } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import type { CaseTemplateCreateInput } from "@/lib/case-templates/schemas";
import { db } from "@/lib/db";
import {
  GiteaAdminClientError,
  type GiteaRepository,
  getGiteaAdminClient,
} from "@/lib/gitea/client";
import {
  deleteCaseRepository,
  generateTemplateRepositoryFromSource,
} from "@/lib/gitea/repositories";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";

type CreateCaseTemplateParams = CaseTemplateCreateInput & {
  actorId: string;
};

export async function createCaseTemplate(input: CreateCaseTemplateParams) {
  const hasTemplateReviewGuide =
    Boolean(input.reviewerInstructions) ||
    Boolean(input.decisionGuidance) ||
    input.rubricCriteria.length > 0;

  const [settings, client] = await Promise.all([
    getWorkspaceSettingsOrThrow(),
    getGiteaAdminClient(),
  ]);

  let sourceRepository: GiteaRepository;

  try {
    sourceRepository = await client.getRepository(
      settings.giteaOrganization,
      input.sourceRepositoryName,
    );
  } catch (error) {
    if (error instanceof GiteaAdminClientError && error.status === 404) {
      throw new Error("The selected Gitea repository could not be found.");
    }

    throw error;
  }

  const sourceRepositoryOwner =
    sourceRepository.owner?.login ??
    sourceRepository.owner?.username ??
    settings.giteaOrganization;
  const finalRepositoryName = input.createDedicatedRepository
    ? (input.targetRepositoryName ?? input.sourceRepositoryName)
    : sourceRepository.name;
  const finalRepositoryOwner = settings.giteaOrganization;
  const finalDefaultBranch = sourceRepository.default_branch ?? "main";
  const finalRepositoryDescription = sourceRepository.description ?? null;
  const repositorySourceKind = input.createDedicatedRepository
    ? CaseTemplateRepositorySourceKind.COPIED_FROM_EXISTING
    : CaseTemplateRepositorySourceKind.LINKED_EXISTING;

  const [existingTemplate, reviewers] = await Promise.all([
    db.caseTemplate.findFirst({
      where: {
        OR: [
          {
            slug: input.slug,
          },
          {
            repositoryOwner: finalRepositoryOwner,
            repositoryName: finalRepositoryName,
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

  if (existingTemplate) {
    throw new Error(
      "A case template with the same slug or repository name already exists.",
    );
  }

  if (reviewers.length !== input.reviewerIds.length) {
    throw new Error(
      "One or more selected template reviewers are invalid or no longer active.",
    );
  }

  if (input.createDedicatedRepository) {
    await generateTemplateRepositoryFromSource({
      actorId: input.actorId,
      sourceOwner: sourceRepositoryOwner,
      sourceRepositoryName: sourceRepository.name,
      destinationOwner: finalRepositoryOwner,
      destinationRepositoryName: finalRepositoryName,
      description: finalRepositoryDescription ?? input.summary,
      defaultBranch: finalDefaultBranch,
    });
  }

  try {
    const template = await db.caseTemplate.create({
      data: {
        slug: input.slug,
        name: input.name,
        summary: input.summary,
        repositoryOwner: finalRepositoryOwner,
        repositoryName: finalRepositoryName,
        repositoryDescription: finalRepositoryDescription,
        repositorySourceKind,
        sourceRepositoryOwner,
        sourceRepositoryName: sourceRepository.name,
        defaultBranch: finalDefaultBranch,
        createdById: input.actorId,
        reviewerAssignments: input.reviewerIds.length
          ? {
              create: input.reviewerIds.map((reviewerId) => ({
                reviewerId,
                assignedById: input.actorId,
              })),
            }
          : undefined,
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
        repositoryOwner: template.repositoryOwner,
        repositoryName: template.repositoryName,
        repositorySourceKind: template.repositorySourceKind,
        sourceRepositoryOwner: template.sourceRepositoryOwner,
        sourceRepositoryName: template.sourceRepositoryName,
        hasTemplateReviewGuide,
        rubricCriteriaCount: template.reviewGuide?._count.rubricCriteria ?? 0,
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
    if (input.createDedicatedRepository) {
      await deleteCaseRepository({
        actorId: input.actorId,
        organizationName: finalRepositoryOwner,
        repositoryName: finalRepositoryName,
        reason: "case.repository.rollback",
      });
    }

    throw error;
  }
}
