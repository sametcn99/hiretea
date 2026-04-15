import { randomBytes } from "node:crypto";
import { CandidateCaseStatus, UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import {
  type AuthorizedActor,
  assertInternalOperator,
} from "@/lib/auth/authorization";
import type { CandidateCaseCreateInput } from "@/lib/candidate-cases/schemas";
import { db } from "@/lib/db";
import {
  grantRepositoryAccess,
  revokeRepositoryAccess,
} from "@/lib/gitea/permissions";
import {
  deleteCaseRepository,
  generateCaseRepositoryFromTemplate,
} from "@/lib/gitea/repositories";
import { hasResolvedWebhookConfiguration } from "@/lib/gitea/runtime-config";
import { ensureRepositoryWebhook } from "@/lib/gitea/webhooks";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";

type CreateCandidateCaseParams = CandidateCaseCreateInput & AuthorizedActor;

const activeCandidateCaseStatuses = [
  CandidateCaseStatus.DRAFT,
  CandidateCaseStatus.PROVISIONING,
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
] as const;

function sanitizeRepositorySegment(value: string) {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/(^[-._]+|[-._]+$)/g, "");

  return sanitized || "candidate-case";
}

function buildCandidateCaseRepositoryName(
  templateSlug: string,
  candidateLogin: string,
) {
  const suffix = randomBytes(2).toString("hex");
  const base = sanitizeRepositorySegment(`${templateSlug}-${candidateLogin}`);
  const maxBaseLength = Math.max(1, 100 - suffix.length - 1);
  const trimmedBase = base.slice(0, maxBaseLength).replace(/[-._]+$/g, "");

  return `${trimmedBase || "candidate-case"}-${suffix}`;
}

export async function createCandidateCase(input: CreateCandidateCaseParams) {
  assertInternalOperator(input, "assign candidate cases");

  const [candidate, template, workspaceSettings, existingCandidateCase] =
    await Promise.all([
      db.user.findUnique({
        where: {
          id: input.candidateId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          giteaIdentity: {
            select: {
              login: true,
            },
          },
        },
      }),
      db.caseTemplate.findUnique({
        where: {
          id: input.caseTemplateId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          repositoryName: true,
          defaultBranch: true,
        },
      }),
      getWorkspaceSettingsOrThrow(),
      db.candidateCase.findFirst({
        where: {
          candidateId: input.candidateId,
          caseTemplateId: input.caseTemplateId,
          status: {
            in: [...activeCandidateCaseStatuses],
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

  if (!candidate || candidate.role !== UserRole.CANDIDATE) {
    throw new Error("The selected candidate does not exist.");
  }

  if (!candidate.isActive) {
    throw new Error("Only active candidates can receive new case assignments.");
  }

  if (!candidate.giteaIdentity?.login) {
    throw new Error(
      "The selected candidate does not have a linked Gitea identity yet.",
    );
  }

  if (!template) {
    throw new Error("The selected case template does not exist.");
  }

  if (existingCandidateCase) {
    throw new Error(
      "This candidate already has an active assignment for the selected template.",
    );
  }

  const repositoryName = buildCandidateCaseRepositoryName(
    template.slug,
    candidate.giteaIdentity.login,
  );
  const repositoryDescription = `${template.name} assignment for ${candidate.name ?? candidate.email ?? candidate.giteaIdentity.login}`;

  let accessGranted = false;

  const repository = await generateCaseRepositoryFromTemplate({
    actorId: input.actorId,
    templateOwner: workspaceSettings.giteaOrganization,
    templateRepositoryName: template.repositoryName,
    repositoryName,
    description: repositoryDescription,
    ownerName: workspaceSettings.giteaOrganization,
    defaultBranch: template.defaultBranch,
  });

  try {
    if (await hasResolvedWebhookConfiguration()) {
      await ensureRepositoryWebhook({
        actorId: input.actorId,
        owner: workspaceSettings.giteaOrganization,
        repositoryName,
      });
    } else {
      await createAuditLog({
        action: "candidate.case.repository.webhook.skipped",
        actorId: input.actorId,
        resourceType: "GiteaRepository",
        resourceId: `${workspaceSettings.giteaOrganization}/${repositoryName}`,
        detail: {
          reason: "Webhook runtime configuration is incomplete.",
        },
      });
    }

    await grantRepositoryAccess({
      actorId: input.actorId,
      owner: workspaceSettings.giteaOrganization,
      repositoryName,
      username: candidate.giteaIdentity.login,
      permission: "write",
    });
    accessGranted = true;

    const repositoryUrl =
      repository.html_url ??
      `${workspaceSettings.giteaBaseUrl.replace(/\/$/, "")}/${workspaceSettings.giteaOrganization}/${repositoryName}`;

    const candidateCase = await db.candidateCase.create({
      data: {
        caseTemplateId: template.id,
        candidateId: candidate.id,
        createdById: input.actorId,
        status: CandidateCaseStatus.READY,
        workingRepository: repositoryName,
        branchName: template.defaultBranch,
        workingRepositoryUrl: repositoryUrl,
        dueAt: input.dueAt ?? null,
        accessGrants: {
          create: {
            repositoryName,
            permissionKey: "write",
            canRead: true,
            canWrite: true,
            canOpenIssues: true,
            canOpenPullRequests: true,
          },
        },
      },
      select: {
        id: true,
        workingRepository: true,
        workingRepositoryUrl: true,
        candidate: {
          select: {
            name: true,
            email: true,
          },
        },
        caseTemplate: {
          select: {
            name: true,
          },
        },
      },
    });

    await createAuditLog({
      action: "candidate.case.assigned",
      actorId: input.actorId,
      resourceType: "CandidateCase",
      resourceId: candidateCase.id,
      detail: {
        candidateId: candidate.id,
        candidateLogin: candidate.giteaIdentity.login,
        templateId: template.id,
        templateSlug: template.slug,
        repositoryName,
      },
    });

    return candidateCase;
  } catch (error) {
    if (accessGranted) {
      await revokeRepositoryAccess({
        actorId: input.actorId,
        owner: workspaceSettings.giteaOrganization,
        repositoryName,
        username: candidate.giteaIdentity.login,
      }).catch(() => undefined);
    }

    await deleteCaseRepository({
      actorId: input.actorId,
      repositoryName,
      organizationName: workspaceSettings.giteaOrganization,
      reason: "candidate.case.repository.rollback",
    }).catch(() => undefined);

    throw error;
  }
}
