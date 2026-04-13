import { createAuditLog } from "@/lib/audit/log";
import { env } from "@/lib/env";
import { getGiteaAdminClient } from "@/lib/gitea/client";

type CreateCaseRepositoryInput = {
  actorId: string;
  name: string;
  description: string;
  defaultBranch?: string;
  organizationName?: string;
};

type GiteaRepositoryResponse = {
  id: number;
  name: string;
  full_name: string;
  html_url?: string;
};

type GenerateCaseRepositoryFromTemplateInput = {
  actorId: string;
  templateOwner: string;
  templateRepositoryName: string;
  repositoryName: string;
  description: string;
  ownerName?: string;
};

export async function createCaseRepository(input: CreateCaseRepositoryInput) {
  const client = getGiteaAdminClient();
  const organizationName =
    input.organizationName ?? env.GITEA_ORGANIZATION_NAME;

  if (!organizationName) {
    throw new Error(
      "A Gitea organization name is required to create repositories.",
    );
  }

  const repository = await client.request<GiteaRepositoryResponse>(
    `/orgs/${organizationName}/repos`,
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        default_branch: input.defaultBranch ?? "main",
        private: true,
        auto_init: false,
      }),
    },
  );

  await createAuditLog({
    action: "case.repository.created",
    actorId: input.actorId,
    resourceType: "GiteaRepository",
    resourceId: String(repository.id),
    detail: {
      name: repository.full_name,
      url: repository.html_url,
    },
  });

  return repository;
}

export async function generateCaseRepositoryFromTemplate(
  input: GenerateCaseRepositoryFromTemplateInput,
) {
  const client = getGiteaAdminClient();
  const ownerName = input.ownerName ?? env.GITEA_ORGANIZATION_NAME;

  if (!ownerName) {
    throw new Error(
      "A Gitea organization name is required to generate repositories from a template.",
    );
  }

  const repository = await client.request<GiteaRepositoryResponse>(
    `/repos/${input.templateOwner}/${input.templateRepositoryName}/generate`,
    {
      method: "POST",
      body: JSON.stringify({
        owner: ownerName,
        name: input.repositoryName,
        description: input.description,
        private: true,
        git_content: true,
        avatar: false,
        git_hooks: false,
        labels: false,
        topics: false,
        webhooks: false,
      }),
    },
  );

  await createAuditLog({
    action: "candidate.case.repository.generated",
    actorId: input.actorId,
    resourceType: "GiteaRepository",
    resourceId: String(repository.id),
    detail: {
      name: repository.full_name,
      sourceTemplate: `${input.templateOwner}/${input.templateRepositoryName}`,
      url: repository.html_url,
    },
  });

  return repository;
}

type DeleteCaseRepositoryInput = {
  actorId?: string;
  repositoryName: string;
  organizationName?: string;
  reason?: string;
};

export async function deleteCaseRepository(input: DeleteCaseRepositoryInput) {
  const client = getGiteaAdminClient();
  const organizationName =
    input.organizationName ?? env.GITEA_ORGANIZATION_NAME;

  if (!organizationName) {
    throw new Error(
      "A Gitea organization name is required to delete repositories.",
    );
  }

  await client.request<void>(
    `/repos/${organizationName}/${input.repositoryName}`,
    {
      method: "DELETE",
    },
  );

  await createAuditLog({
    action: input.reason ?? "case.repository.deleted",
    actorId: input.actorId,
    resourceType: "GiteaRepository",
    resourceId: `${organizationName}/${input.repositoryName}`,
    detail: {
      repositoryName: input.repositoryName,
    },
  });
}
