import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAuditLog } from "@/lib/audit/log";
import {
  type RunGitCommandInput,
  runGitCommand,
} from "@/lib/git/run-git-command";
import { getGiteaAdminClient } from "@/lib/gitea/client";
import { getResolvedGiteaAdminConfig } from "@/lib/gitea/runtime-config";

const defaultRepositorySyncGitOptions = {
  errorContext: "Repository content sync failed.",
  timeoutMs: 300_000,
} satisfies Pick<RunGitCommandInput, "errorContext" | "timeoutMs">;

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
  defaultBranch?: string;
};

type GiteaCurrentUserResponse = {
  login: string;
};

function buildRepositoryGitUrl(input: {
  baseUrl: string;
  owner: string;
  repositoryName: string;
}) {
  return new URL(
    `${input.owner}/${input.repositoryName}.git`,
    `${input.baseUrl.replace(/\/$/, "")}/`,
  ).toString();
}

function createRepositorySyncGitCommandInput(
  input: {
    args: string[];
    authHeader: string;
    gitDir?: string;
  } & Partial<Pick<RunGitCommandInput, "cwd" | "errorContext" | "timeoutMs">>,
): RunGitCommandInput {
  return {
    ...defaultRepositorySyncGitOptions,
    ...input,
    config: [
      {
        key: "http.extraHeader",
        value: input.authHeader,
      },
    ],
  };
}

async function syncRepositoryContents(input: {
  sourceOwner: string;
  sourceRepositoryName: string;
  destinationOwner: string;
  destinationRepositoryName: string;
}) {
  const client = await getGiteaAdminClient();
  const adminConfig = await getResolvedGiteaAdminConfig();
  const currentUser = await client.request<GiteaCurrentUserResponse>("/user");
  const authHeader = `Authorization: Basic ${Buffer.from(
    `${currentUser.login}:${adminConfig.token}`,
  ).toString("base64")}`;
  const sourceRepositoryUrl = buildRepositoryGitUrl({
    baseUrl: adminConfig.baseUrl,
    owner: input.sourceOwner,
    repositoryName: input.sourceRepositoryName,
  });
  const destinationRepositoryUrl = buildRepositoryGitUrl({
    baseUrl: adminConfig.baseUrl,
    owner: input.destinationOwner,
    repositoryName: input.destinationRepositoryName,
  });
  const tempDirectory = await mkdtemp(join(tmpdir(), "hiretea-template-"));
  const mirrorDirectory = join(
    tempDirectory,
    `${input.destinationRepositoryName}.git`,
  );

  try {
    await runGitCommand(
      createRepositorySyncGitCommandInput({
        args: ["clone", "--mirror", sourceRepositoryUrl, mirrorDirectory],
        authHeader,
      }),
    );
    await runGitCommand(
      createRepositorySyncGitCommandInput({
        args: ["push", "--mirror", destinationRepositoryUrl],
        gitDir: mirrorDirectory,
        authHeader,
      }),
    );
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

export async function createCaseRepository(input: CreateCaseRepositoryInput) {
  const client = await getGiteaAdminClient();
  const adminConfig = await getResolvedGiteaAdminConfig();
  const organizationName = input.organizationName ?? adminConfig.organization;

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
  const adminConfig = await getResolvedGiteaAdminConfig();
  const ownerName = input.ownerName ?? adminConfig.organization;

  if (!ownerName) {
    throw new Error(
      "A Gitea organization name is required to generate repositories from a template.",
    );
  }

  const repository = await createCaseRepository({
    actorId: input.actorId,
    name: input.repositoryName,
    description: input.description,
    defaultBranch: input.defaultBranch,
    organizationName: ownerName,
  });

  try {
    await syncRepositoryContents({
      sourceOwner: input.templateOwner,
      sourceRepositoryName: input.templateRepositoryName,
      destinationOwner: ownerName,
      destinationRepositoryName: input.repositoryName,
    });
  } catch (error) {
    await deleteCaseRepository({
      actorId: input.actorId,
      organizationName: ownerName,
      repositoryName: input.repositoryName,
      reason: "candidate.case.repository.rollback",
    });

    throw error;
  }

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
  const client = await getGiteaAdminClient();
  const adminConfig = await getResolvedGiteaAdminConfig();
  const organizationName = input.organizationName ?? adminConfig.organization;

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
