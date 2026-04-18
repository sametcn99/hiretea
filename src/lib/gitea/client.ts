import { getResolvedGiteaAdminConfig } from "@/lib/gitea/runtime-config";

type GiteaRequestOptions = RequestInit & {
  searchParams?: URLSearchParams;
};

type GiteaErrorPayload = {
  message?: string;
};

export type GiteaInternalTracker = {
  enable_time_tracker?: boolean;
  allow_only_contributors_to_track_time?: boolean;
  enable_issue_dependencies?: boolean;
};

export type GiteaExternalTracker = {
  external_tracker_url?: string;
  external_tracker_format?: string;
  external_tracker_style?: string;
  external_tracker_regexp_pattern?: string;
};

export type GiteaExternalWiki = {
  external_wiki_url?: string;
};

export type GiteaRepository = {
  id: number;
  name: string;
  full_name: string;
  owner?: GiteaUserReference | null;
  html_url?: string;
  clone_url?: string;
  default_branch?: string;
  description?: string;
  website?: string;
  private?: boolean;
  has_issues?: boolean;
  internal_tracker?: GiteaInternalTracker | null;
  external_tracker?: GiteaExternalTracker | null;
  has_wiki?: boolean;
  external_wiki?: GiteaExternalWiki | null;
  has_pull_requests?: boolean;
  has_projects?: boolean;
  projects_mode?: "repo" | "owner" | "all";
  has_releases?: boolean;
  has_packages?: boolean;
  has_actions?: boolean;
  ignore_whitespace_conflicts?: boolean;
  allow_merge_commits?: boolean;
  allow_rebase?: boolean;
  allow_rebase_explicit?: boolean;
  allow_squash_merge?: boolean;
  allow_fast_forward_only_merge?: boolean;
  allow_manual_merge?: boolean;
  autodetect_manual_merge?: boolean;
  allow_rebase_update?: boolean;
  default_delete_branch_after_merge?: boolean;
  default_merge_style?: string;
  default_allow_maintainer_edit?: boolean;
  archived?: boolean;
};

export type GiteaUserReference = {
  login?: string;
  username?: string;
  full_name?: string;
};

export type GiteaRepositoryCommit = {
  sha: string;
  html_url?: string;
  author?: GiteaUserReference | null;
  commit?: {
    message?: string;
    author?: {
      name?: string;
      email?: string;
      date?: string;
    };
    committer?: {
      name?: string;
      email?: string;
      date?: string;
    };
  };
};

export type GiteaPullRequest = {
  number: number;
  title: string;
  html_url?: string;
  state?: string;
  draft?: boolean;
  merged?: boolean;
  created_at?: string;
  updated_at?: string;
  user?: GiteaUserReference | null;
};

export type GiteaTeam = {
  id: number;
  name: string;
  description?: string;
  permission: "none" | "read" | "write" | "admin";
  can_create_org_repo?: boolean;
  includes_all_repositories?: boolean;
};

export type GiteaCreateTeamOptions = {
  name: string;
  description?: string;
  permission: "read" | "write" | "admin";
  can_create_org_repo: boolean;
  includes_all_repositories: boolean;
};

export type GiteaEditRepositoryOptions = {
  name?: string;
  description?: string;
  website?: string;
  has_issues?: boolean;
  internal_tracker?: GiteaInternalTracker | null;
  external_tracker?: GiteaExternalTracker | null;
  has_wiki?: boolean;
  external_wiki?: GiteaExternalWiki | null;
  default_branch?: string;
  has_pull_requests?: boolean;
  has_projects?: boolean;
  projects_mode?: "repo" | "owner" | "all";
  has_releases?: boolean;
  has_packages?: boolean;
  has_actions?: boolean;
  ignore_whitespace_conflicts?: boolean;
  allow_merge_commits?: boolean;
  allow_rebase?: boolean;
  allow_rebase_explicit?: boolean;
  allow_squash_merge?: boolean;
  allow_fast_forward_only_merge?: boolean;
  allow_manual_merge?: boolean;
  autodetect_manual_merge?: boolean;
  allow_rebase_update?: boolean;
  default_delete_branch_after_merge?: boolean;
  default_merge_style?: string;
  default_allow_maintainer_edit?: boolean;
};

export type GiteaMigrateRepositoryOptions = {
  clone_addr: string;
  repo_owner: string;
  repo_name: string;
  service: "gitea";
  auth_token: string;
  private: boolean;
  description: string;
  wiki: boolean;
  milestones: boolean;
  labels: boolean;
  issues: boolean;
  pull_requests: boolean;
  releases: boolean;
  mirror?: boolean;
};

export type GiteaBranchProtection = {
  rule_name: string;
  priority: number;
  enable_push: boolean;
  enable_push_whitelist: boolean;
  push_whitelist_usernames: string[];
  push_whitelist_teams: string[];
  push_whitelist_deploy_keys: boolean;
  enable_force_push: boolean;
  enable_force_push_allowlist: boolean;
  force_push_allowlist_usernames: string[];
  force_push_allowlist_teams: string[];
  force_push_allowlist_deploy_keys: boolean;
  enable_merge_whitelist: boolean;
  merge_whitelist_usernames: string[];
  merge_whitelist_teams: string[];
  enable_status_check: boolean;
  status_check_contexts: string[];
  required_approvals: number;
  enable_approvals_whitelist: boolean;
  approvals_whitelist_usernames: string[];
  approvals_whitelist_teams: string[];
  block_on_rejected_reviews: boolean;
  block_on_official_review_requests: boolean;
  block_on_outdated_branch: boolean;
  dismiss_stale_approvals: boolean;
  ignore_stale_approvals: boolean;
  require_signed_commits: boolean;
  protected_file_patterns: string;
  unprotected_file_patterns: string;
  block_admin_merge_override: boolean;
};

export type GiteaCreateBranchProtectionOptions = {
  rule_name: string;
  priority: number;
  enable_push: boolean;
  enable_push_whitelist: boolean;
  push_whitelist_usernames: string[];
  push_whitelist_teams: string[];
  push_whitelist_deploy_keys: boolean;
  enable_force_push: boolean;
  enable_force_push_allowlist: boolean;
  force_push_allowlist_usernames: string[];
  force_push_allowlist_teams: string[];
  force_push_allowlist_deploy_keys: boolean;
  enable_merge_whitelist: boolean;
  merge_whitelist_usernames: string[];
  merge_whitelist_teams: string[];
  enable_status_check: boolean;
  status_check_contexts: string[];
  required_approvals: number;
  enable_approvals_whitelist: boolean;
  approvals_whitelist_usernames: string[];
  approvals_whitelist_teams: string[];
  block_on_rejected_reviews: boolean;
  block_on_official_review_requests: boolean;
  dismiss_stale_approvals: boolean;
  ignore_stale_approvals: boolean;
  require_signed_commits: boolean;
  protected_file_patterns: string;
  unprotected_file_patterns: string;
  block_on_outdated_branch: boolean;
  block_admin_merge_override: boolean;
};

export class GiteaAdminClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GiteaAdminClientError";
  }
}

export class GiteaAdminClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async request<T>(path: string, options: GiteaRequestOptions = {}) {
    const url = new URL(
      path.replace(/^\//, ""),
      `${this.baseUrl.replace(/\/$/, "")}/api/v1/`,
    );

    if (options.searchParams) {
      url.search = options.searchParams.toString();
    }

    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `token ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let message = `Gitea request failed with status ${response.status}.`;

      try {
        const errorPayload = (await response.json()) as GiteaErrorPayload;

        if (errorPayload.message) {
          message = errorPayload.message;
        }
      } catch {
        const errorText = await response.text().catch(() => "");

        if (errorText) {
          message = errorText;
        }
      }

      throw new GiteaAdminClientError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async getRepository(owner: string, repositoryName: string) {
    return this.request<GiteaRepository>(`/repos/${owner}/${repositoryName}`);
  }

  async listOrganizationRepositories(
    org: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    const searchParams = new URLSearchParams();

    if (options.page) {
      searchParams.set("page", String(options.page));
    }

    if (options.limit) {
      searchParams.set("limit", String(options.limit));
    }

    return this.request<GiteaRepository[]>(`/orgs/${org}/repos`, {
      searchParams,
    });
  }

  async editRepository(
    owner: string,
    repositoryName: string,
    options: GiteaEditRepositoryOptions,
  ) {
    return this.request<GiteaRepository>(`/repos/${owner}/${repositoryName}`, {
      method: "PATCH",
      body: JSON.stringify(options),
    });
  }

  async listRepositoryCommits(
    owner: string,
    repositoryName: string,
    limit = 10,
  ) {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(limit));

    return this.request<GiteaRepositoryCommit[]>(
      `/repos/${owner}/${repositoryName}/commits`,
      {
        searchParams,
      },
    );
  }

  async listRepositoryPullRequests(
    owner: string,
    repositoryName: string,
    options: {
      state?: "open" | "closed" | "all";
      limit?: number;
    } = {},
  ) {
    const searchParams = new URLSearchParams();

    if (options.state) {
      searchParams.set("state", options.state);
    }

    if (options.limit) {
      searchParams.set("limit", String(options.limit));
    }

    return this.request<GiteaPullRequest[]>(
      `/repos/${owner}/${repositoryName}/pulls`,
      {
        searchParams,
      },
    );
  }

  async migrateRepository(options: GiteaMigrateRepositoryOptions) {
    return this.request<GiteaRepository>("/repos/migrate", {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  async listBranchProtections(owner: string, repositoryName: string) {
    return this.request<GiteaBranchProtection[]>(
      `/repos/${owner}/${repositoryName}/branch_protections`,
    );
  }

  async createBranchProtection(
    owner: string,
    repositoryName: string,
    options: GiteaCreateBranchProtectionOptions,
  ) {
    return this.request<GiteaBranchProtection>(
      `/repos/${owner}/${repositoryName}/branch_protections`,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );
  }

  async listOrganizationTeams(org: string) {
    return this.request<GiteaTeam[]>(`/orgs/${org}/teams`);
  }

  async createOrganizationTeam(org: string, options: GiteaCreateTeamOptions) {
    return this.request<GiteaTeam>(`/orgs/${org}/teams`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  async addTeamMember(teamId: number, username: string) {
    return this.request<void>(`/teams/${teamId}/members/${username}`, {
      method: "PUT",
    });
  }
}

export function createGiteaAdminClient(baseUrl: string, token: string) {
  return new GiteaAdminClient(baseUrl, token);
}

export async function getGiteaAdminClient() {
  const config = await getResolvedGiteaAdminConfig();

  return new GiteaAdminClient(config.baseUrl, config.token);
}
