import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAuditLog } from "@/lib/audit/log";
import {
  type RunGitCommandInput,
  runGitCommand,
} from "@/lib/git/run-git-command";
import {
  type GiteaBranchProtection,
  type GiteaCreateBranchProtectionOptions,
  type GiteaEditRepositoryOptions,
  type GiteaRepository,
  getGiteaAdminClient,
} from "@/lib/gitea/client";
import {
  getResolvedGiteaAdminConfig,
  getResolvedGiteaMigrationConfig,
} from "@/lib/gitea/runtime-config";

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

const candidateRepositoryMigrationOptions = {
  wiki: true,
  milestones: true,
  labels: true,
  issues: true,
  pull_requests: true,
  releases: true,
} as const;

function shouldFallbackToGitMirrorSync(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("migration failed: clone error") ||
    message.includes("clone error: exit status 128")
  );
}

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

export async function syncRepositoryContents(input: {
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

function buildRepositoryEditPayload(
  repository: GiteaRepository,
): GiteaEditRepositoryOptions {
  const payload: GiteaEditRepositoryOptions = {};

  if (repository.description !== undefined) {
    payload.description = repository.description;
  }

  if (repository.website !== undefined) {
    payload.website = repository.website;
  }

  if (repository.has_issues !== undefined) {
    payload.has_issues = repository.has_issues;
  }

  if (repository.internal_tracker !== undefined) {
    payload.internal_tracker = repository.internal_tracker;
  }

  if (repository.external_tracker !== undefined) {
    payload.external_tracker = repository.external_tracker;
  }

  if (repository.has_wiki !== undefined) {
    payload.has_wiki = repository.has_wiki;
  }

  if (repository.external_wiki !== undefined) {
    payload.external_wiki = repository.external_wiki;
  }

  if (repository.default_branch !== undefined) {
    payload.default_branch = repository.default_branch;
  }

  if (repository.has_pull_requests !== undefined) {
    payload.has_pull_requests = repository.has_pull_requests;
  }

  if (repository.has_projects !== undefined) {
    payload.has_projects = repository.has_projects;
  }

  if (repository.projects_mode !== undefined) {
    payload.projects_mode = repository.projects_mode;
  }

  if (repository.has_releases !== undefined) {
    payload.has_releases = repository.has_releases;
  }

  if (repository.has_packages !== undefined) {
    payload.has_packages = repository.has_packages;
  }

  if (repository.has_actions !== undefined) {
    payload.has_actions = repository.has_actions;
  }

  if (repository.ignore_whitespace_conflicts !== undefined) {
    payload.ignore_whitespace_conflicts =
      repository.ignore_whitespace_conflicts;
  }

  if (repository.allow_merge_commits !== undefined) {
    payload.allow_merge_commits = repository.allow_merge_commits;
  }

  if (repository.allow_rebase !== undefined) {
    payload.allow_rebase = repository.allow_rebase;
  }

  if (repository.allow_rebase_explicit !== undefined) {
    payload.allow_rebase_explicit = repository.allow_rebase_explicit;
  }

  if (repository.allow_squash_merge !== undefined) {
    payload.allow_squash_merge = repository.allow_squash_merge;
  }

  if (repository.allow_fast_forward_only_merge !== undefined) {
    payload.allow_fast_forward_only_merge =
      repository.allow_fast_forward_only_merge;
  }

  if (repository.allow_manual_merge !== undefined) {
    payload.allow_manual_merge = repository.allow_manual_merge;
  }

  if (repository.autodetect_manual_merge !== undefined) {
    payload.autodetect_manual_merge = repository.autodetect_manual_merge;
  }

  if (repository.allow_rebase_update !== undefined) {
    payload.allow_rebase_update = repository.allow_rebase_update;
  }

  if (repository.default_delete_branch_after_merge !== undefined) {
    payload.default_delete_branch_after_merge =
      repository.default_delete_branch_after_merge;
  }

  if (repository.default_merge_style !== undefined) {
    payload.default_merge_style = repository.default_merge_style;
  }

  if (repository.default_allow_maintainer_edit !== undefined) {
    payload.default_allow_maintainer_edit =
      repository.default_allow_maintainer_edit;
  }

  return payload;
}

function buildBranchProtectionCreatePayload(
  branchProtection: GiteaBranchProtection,
): GiteaCreateBranchProtectionOptions {
  return {
    rule_name: branchProtection.rule_name,
    priority: branchProtection.priority,
    enable_push: branchProtection.enable_push,
    enable_push_whitelist: branchProtection.enable_push_whitelist,
    push_whitelist_usernames: branchProtection.push_whitelist_usernames ?? [],
    push_whitelist_teams: branchProtection.push_whitelist_teams ?? [],
    push_whitelist_deploy_keys: branchProtection.push_whitelist_deploy_keys,
    enable_force_push: branchProtection.enable_force_push,
    enable_force_push_allowlist: branchProtection.enable_force_push_allowlist,
    force_push_allowlist_usernames:
      branchProtection.force_push_allowlist_usernames ?? [],
    force_push_allowlist_teams:
      branchProtection.force_push_allowlist_teams ?? [],
    force_push_allowlist_deploy_keys:
      branchProtection.force_push_allowlist_deploy_keys,
    enable_merge_whitelist: branchProtection.enable_merge_whitelist,
    merge_whitelist_usernames: branchProtection.merge_whitelist_usernames ?? [],
    merge_whitelist_teams: branchProtection.merge_whitelist_teams ?? [],
    enable_status_check: branchProtection.enable_status_check,
    status_check_contexts: branchProtection.status_check_contexts ?? [],
    required_approvals: branchProtection.required_approvals,
    enable_approvals_whitelist: branchProtection.enable_approvals_whitelist,
    approvals_whitelist_usernames:
      branchProtection.approvals_whitelist_usernames ?? [],
    approvals_whitelist_teams: branchProtection.approvals_whitelist_teams ?? [],
    block_on_rejected_reviews: branchProtection.block_on_rejected_reviews,
    block_on_official_review_requests:
      branchProtection.block_on_official_review_requests,
    dismiss_stale_approvals: branchProtection.dismiss_stale_approvals,
    ignore_stale_approvals: branchProtection.ignore_stale_approvals,
    require_signed_commits: branchProtection.require_signed_commits,
    protected_file_patterns: branchProtection.protected_file_patterns,
    unprotected_file_patterns: branchProtection.unprotected_file_patterns,
    block_on_outdated_branch: branchProtection.block_on_outdated_branch,
    block_admin_merge_override: branchProtection.block_admin_merge_override,
  };
}

async function normalizeMigratedRepository(input: {
  actorId: string;
  sourceOwner: string;
  sourceRepositoryName: string;
  destinationOwner: string;
  destinationRepositoryName: string;
}) {
  const client = await getGiteaAdminClient();

  const [sourceRepository, sourceBranchProtections] = await Promise.all([
    client.getRepository(input.sourceOwner, input.sourceRepositoryName),
    client.listBranchProtections(input.sourceOwner, input.sourceRepositoryName),
  ]);

  await client.editRepository(
    input.destinationOwner,
    input.destinationRepositoryName,
    buildRepositoryEditPayload(sourceRepository),
  );

  for (const branchProtection of sourceBranchProtections) {
    await client.createBranchProtection(
      input.destinationOwner,
      input.destinationRepositoryName,
      buildBranchProtectionCreatePayload(branchProtection),
    );
  }

  await createAuditLog({
    action: "candidate.case.repository.normalized",
    actorId: input.actorId,
    resourceType: "GiteaRepository",
    resourceId: `${input.destinationOwner}/${input.destinationRepositoryName}`,
    detail: {
      sourceTemplate: `${input.sourceOwner}/${input.sourceRepositoryName}`,
      protectedBranchCount: sourceBranchProtections.length,
    },
  });
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

  const repository = await client.request<GiteaRepository>(
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
  const [adminConfig, migrationConfig, client] = await Promise.all([
    getResolvedGiteaAdminConfig(),
    getResolvedGiteaMigrationConfig(),
    getGiteaAdminClient(),
  ]);
  const ownerName = input.ownerName ?? adminConfig.organization;

  if (!ownerName) {
    throw new Error(
      "A Gitea organization name is required to generate repositories from a template.",
    );
  }

  const cloneAddress = buildRepositoryGitUrl({
    baseUrl: migrationConfig.baseUrl,
    owner: input.templateOwner,
    repositoryName: input.templateRepositoryName,
  });

  await createAuditLog({
    action: "candidate.case.repository.migration.started",
    actorId: input.actorId,
    resourceType: "GiteaRepository",
    resourceId: `${ownerName}/${input.repositoryName}`,
    detail: {
      sourceTemplate: `${input.templateOwner}/${input.templateRepositoryName}`,
      cloneAddress,
    },
  });

  let repository: GiteaRepository | null = null;
  let provisioningMethod = "gitea-migration";

  try {
    repository = await client.migrateRepository({
      clone_addr: cloneAddress,
      repo_owner: ownerName,
      repo_name: input.repositoryName,
      service: "gitea",
      auth_token: migrationConfig.token,
      private: true,
      description: input.description,
      mirror: false,
      ...candidateRepositoryMigrationOptions,
    });

    await normalizeMigratedRepository({
      actorId: input.actorId,
      sourceOwner: input.templateOwner,
      sourceRepositoryName: input.templateRepositoryName,
      destinationOwner: ownerName,
      destinationRepositoryName: input.repositoryName,
    });
  } catch (error) {
    if (shouldFallbackToGitMirrorSync(error)) {
      await createAuditLog({
        action: "candidate.case.repository.migration.fallback.started",
        actorId: input.actorId,
        resourceType: "GiteaRepository",
        resourceId: `${ownerName}/${input.repositoryName}`,
        detail: {
          sourceTemplate: `${input.templateOwner}/${input.templateRepositoryName}`,
          reason: error instanceof Error ? error.message : "Migration failed.",
        },
      }).catch(() => undefined);

      await deleteCaseRepository({
        actorId: input.actorId,
        organizationName: ownerName,
        repositoryName: input.repositoryName,
        reason: "candidate.case.repository.rollback",
      }).catch(() => undefined);

      try {
        repository = await createCaseRepository({
          actorId: input.actorId,
          name: input.repositoryName,
          description: input.description,
          defaultBranch: input.defaultBranch,
          organizationName: ownerName,
        });

        await syncRepositoryContents({
          sourceOwner: input.templateOwner,
          sourceRepositoryName: input.templateRepositoryName,
          destinationOwner: ownerName,
          destinationRepositoryName: input.repositoryName,
        });

        await normalizeMigratedRepository({
          actorId: input.actorId,
          sourceOwner: input.templateOwner,
          sourceRepositoryName: input.templateRepositoryName,
          destinationOwner: ownerName,
          destinationRepositoryName: input.repositoryName,
        });

        provisioningMethod = "git-mirror-fallback";
      } catch (fallbackError) {
        await deleteCaseRepository({
          actorId: input.actorId,
          organizationName: ownerName,
          repositoryName: input.repositoryName,
          reason: "candidate.case.repository.rollback",
        }).catch(() => undefined);

        await createAuditLog({
          action: "candidate.case.repository.migration.fallback.failed",
          actorId: input.actorId,
          resourceType: "GiteaRepository",
          resourceId: `${ownerName}/${input.repositoryName}`,
          detail: {
            sourceTemplate: `${input.templateOwner}/${input.templateRepositoryName}`,
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : "Repository mirror sync failed.",
          },
        }).catch(() => undefined);

        throw fallbackError;
      }
    } else {
      await deleteCaseRepository({
        actorId: input.actorId,
        organizationName: ownerName,
        repositoryName: input.repositoryName,
        reason: "candidate.case.repository.rollback",
      }).catch(() => undefined);

      await createAuditLog({
        action: "candidate.case.repository.migration.failed",
        actorId: input.actorId,
        resourceType: "GiteaRepository",
        resourceId: `${ownerName}/${input.repositoryName}`,
        detail: {
          sourceTemplate: `${input.templateOwner}/${input.templateRepositoryName}`,
          error:
            error instanceof Error
              ? error.message
              : "Repository migration failed.",
        },
      }).catch(() => undefined);

      throw error;
    }
  }

  if (!repository) {
    throw new Error("Repository provisioning did not return a repository.");
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
      provisioningMethod,
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
