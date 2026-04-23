import {
  type CandidateCaseCompletionSource,
  type CandidateCaseDecision,
  type CandidateCaseStatus,
  CandidateCaseStatus as CandidateCaseStatusValue,
  UserRole,
} from "@prisma/client";
import { syncExpiredCandidateCompletions } from "@/lib/candidate-cases/candidate-completion";
import { db } from "@/lib/db";
import { getGiteaAdminClient } from "@/lib/gitea/client";
import { getWorkspaceSettings } from "@/lib/workspace-settings/queries";

export type CandidateCaseListItem = {
  id: string;
  candidateId: string;
  caseTemplateId: string;
  status: CandidateCaseStatus;
  decision: CandidateCaseDecision | null;
  workingRepository: string | null;
  workingRepositoryUrl: string | null;
  branchName: string | null;
  dueAt: Date | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  lastSyncedAt: Date | null;
  candidateCompletionRequestedAt: Date | null;
  candidateCompletionLockedAt: Date | null;
  candidateCompletionSource: CandidateCaseCompletionSource | null;
  createdAt: Date;
  candidateDisplayName: string;
  candidateEmail: string;
  candidateLogin: string | null;
  templateName: string;
  templateSlug: string;
  createdByName: string;
  reviewerIds: string[];
  reviewerDisplayNames: string[];
};

type ListCandidateCasesOptions = {
  includeArchived?: boolean;
};

export type CandidateCaseAssignmentCandidateOption = {
  id: string;
  displayName: string;
  email: string;
  giteaLogin: string;
  caseCount: number;
};

export type CandidateCaseAssignmentTemplateOption = {
  id: string;
  name: string;
  slug: string;
  repositoryName: string;
  defaultBranch: string;
  defaultReviewerIds: string[];
  assignmentCount: number;
};

export type CandidateCaseAssignmentReviewerOption = {
  id: string;
  displayName: string;
  email: string;
};

export type CandidateCaseAssignmentOptions = {
  candidates: CandidateCaseAssignmentCandidateOption[];
  templates: CandidateCaseAssignmentTemplateOption[];
  reviewers: CandidateCaseAssignmentReviewerOption[];
  workspaceOrganization: string | null;
};

export type CandidateCaseReviewHistoryItem = {
  id: string;
  score: number | null;
  summary: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
};

export type CandidateCaseRubricCriterionItem = {
  id: string;
  title: string;
  description: string | null;
  weight: number | null;
  sortOrder: number;
};

export type CandidateCaseAccessGrantItem = {
  id: string;
  repositoryName: string;
  permissionKey: string;
  canRead: boolean;
  canWrite: boolean;
  canOpenIssues: boolean;
  canOpenPullRequests: boolean;
  grantedAt: Date;
  revokedAt: Date | null;
};

export type CandidateCaseAuditLogItem = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  detail: unknown;
  createdAt: Date;
  actor: {
    name: string | null;
    email: string | null;
  } | null;
};

export type CandidateCaseWebhookDeliveryItem = {
  id: string;
  deliveryId: string | null;
  eventName: string;
  action: string | null;
  branchName: string | null;
  repositoryName: string | null;
  statusCode: number | null;
  errorMessage: string | null;
  processedAt: Date | null;
  createdAt: Date;
};

export type CandidateCaseRepositoryCommitItem = {
  sha: string;
  message: string;
  authoredAt: Date | null;
  authorName: string | null;
  authorLogin: string | null;
  url: string | null;
};

export type CandidateCaseRepositoryPullRequestItem = {
  number: number;
  title: string;
  state: string;
  isDraft: boolean;
  isMerged: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  authorName: string | null;
  url: string | null;
};

export type CandidateCaseRepositoryActivity = {
  commits: CandidateCaseRepositoryCommitItem[];
  pullRequests: CandidateCaseRepositoryPullRequestItem[];
  error: string | null;
};

export type CandidateCaseDetail = CandidateCaseListItem & {
  reviewedAt: Date | null;
  templateSummary: string;
  templateRepositoryName: string;
  templateRepositoryDescription: string | null;
  templateDefaultBranch: string;
  templateReviewerInstructions: string | null;
  templateDecisionGuidance: string | null;
  rubricCriteria: CandidateCaseRubricCriterionItem[];
  accessGrants: CandidateCaseAccessGrantItem[];
  reviewHistory: CandidateCaseReviewHistoryItem[];
  auditLogs: CandidateCaseAuditLogItem[];
  webhookDeliveries: CandidateCaseWebhookDeliveryItem[];
  repositoryActivity: CandidateCaseRepositoryActivity;
  notesCount: number;
  latestScore: number | null;
  latestSummary: string | null;
  latestReviewedAt: Date | null;
  latestReviewerName: string | null;
};

function getWebhookRepositoryName(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const repository = (payload as { repository?: { name?: unknown } })
    .repository;

  if (!repository || typeof repository !== "object") {
    return null;
  }

  return typeof repository.name === "string" ? repository.name : null;
}

function getWebhookAction(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const action = (payload as { action?: unknown }).action;

  return typeof action === "string" ? action : null;
}

function getWebhookBranchName(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const ref = (payload as { ref?: unknown }).ref;

  if (typeof ref !== "string") {
    return null;
  }

  return ref.startsWith("refs/heads/") ? ref.replace("refs/heads/", "") : ref;
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

async function getCandidateCaseRepositoryActivity(input: {
  owner: string | null;
  repositoryName: string | null;
}): Promise<CandidateCaseRepositoryActivity> {
  if (!input.owner || !input.repositoryName) {
    return {
      commits: [],
      pullRequests: [],
      error: null,
    };
  }

  try {
    const client = await getGiteaAdminClient();
    const [commitsResult, pullRequestsResult] = await Promise.allSettled([
      client.listRepositoryCommits(input.owner, input.repositoryName, 8),
      client.listRepositoryPullRequests(input.owner, input.repositoryName, {
        state: "all",
        limit: 8,
      }),
    ]);

    const commits =
      commitsResult.status === "fulfilled"
        ? commitsResult.value.map<CandidateCaseRepositoryCommitItem>(
            (commit) => ({
              sha: commit.sha,
              message:
                commit.commit?.message?.split("\n")[0] ?? "No commit message",
              authoredAt:
                parseDate(commit.commit?.author?.date) ??
                parseDate(commit.commit?.committer?.date),
              authorName:
                commit.author?.full_name ??
                commit.commit?.author?.name ??
                commit.author?.login ??
                commit.author?.username ??
                null,
              authorLogin:
                commit.author?.login ?? commit.author?.username ?? null,
              url: commit.html_url ?? null,
            }),
          )
        : [];

    const pullRequests =
      pullRequestsResult.status === "fulfilled"
        ? pullRequestsResult.value.map<CandidateCaseRepositoryPullRequestItem>(
            (pullRequest) => ({
              number: pullRequest.number,
              title: pullRequest.title,
              state: pullRequest.merged
                ? "merged"
                : (pullRequest.state ?? "unknown"),
              isDraft: Boolean(pullRequest.draft),
              isMerged: Boolean(pullRequest.merged),
              createdAt: parseDate(pullRequest.created_at),
              updatedAt: parseDate(pullRequest.updated_at),
              authorName:
                pullRequest.user?.full_name ??
                pullRequest.user?.login ??
                pullRequest.user?.username ??
                null,
              url: pullRequest.html_url ?? null,
            }),
          )
        : [];

    const errorMessages = [commitsResult, pullRequestsResult]
      .filter((result) => result.status === "rejected")
      .map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : "Repository activity could not be loaded.",
      );

    return {
      commits,
      pullRequests,
      error: errorMessages.length > 0 ? errorMessages.join(" ") : null,
    };
  } catch (error) {
    return {
      commits: [],
      pullRequests: [],
      error:
        error instanceof Error
          ? error.message
          : "Repository activity could not be loaded.",
    };
  }
}

export async function listCandidateCases(
  options: ListCandidateCasesOptions = {},
) {
  await syncExpiredCandidateCompletions();
  const candidateCases = await db.candidateCase.findMany({
    where: options.includeArchived
      ? undefined
      : {
          status: {
            not: CandidateCaseStatusValue.ARCHIVED,
          },
        },
    include: {
      candidate: {
        select: {
          name: true,
          email: true,
          giteaIdentity: {
            select: {
              login: true,
            },
          },
        },
      },
      caseTemplate: {
        select: {
          name: true,
          slug: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      reviewerAssignments: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          reviewerId: true,
          reviewer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return candidateCases.map<CandidateCaseListItem>((candidateCase) => ({
    id: candidateCase.id,
    candidateId: candidateCase.candidateId,
    caseTemplateId: candidateCase.caseTemplateId,
    status: candidateCase.status,
    decision: candidateCase.decision ?? null,
    workingRepository: candidateCase.workingRepository ?? null,
    workingRepositoryUrl: candidateCase.workingRepositoryUrl ?? null,
    branchName: candidateCase.branchName ?? null,
    dueAt: candidateCase.dueAt ?? null,
    startedAt: candidateCase.startedAt ?? null,
    submittedAt: candidateCase.submittedAt ?? null,
    lastSyncedAt: candidateCase.lastSyncedAt ?? null,
    candidateCompletionRequestedAt:
      candidateCase.candidateCompletionRequestedAt ?? null,
    candidateCompletionLockedAt:
      candidateCase.candidateCompletionLockedAt ?? null,
    candidateCompletionSource: candidateCase.candidateCompletionSource ?? null,
    createdAt: candidateCase.createdAt,
    candidateDisplayName:
      candidateCase.candidate.name ??
      candidateCase.candidate.email ??
      "Unnamed candidate",
    candidateEmail: candidateCase.candidate.email ?? "No email",
    candidateLogin: candidateCase.candidate.giteaIdentity?.login ?? null,
    templateName: candidateCase.caseTemplate.name,
    templateSlug: candidateCase.caseTemplate.slug,
    createdByName:
      candidateCase.createdBy.name ??
      candidateCase.createdBy.email ??
      "Unknown owner",
    reviewerIds: candidateCase.reviewerAssignments.map(
      (assignment) => assignment.reviewerId,
    ),
    reviewerDisplayNames: candidateCase.reviewerAssignments.map(
      (assignment) =>
        assignment.reviewer.name ??
        assignment.reviewer.email ??
        "Unknown reviewer",
    ),
  }));
}

export async function getCandidateCaseAssignmentOptions(): Promise<CandidateCaseAssignmentOptions> {
  const [candidates, templates, reviewers, workspaceSettings] =
    await Promise.all([
      db.user.findMany({
        where: {
          role: UserRole.CANDIDATE,
          isActive: true,
        },
        include: {
          giteaIdentity: {
            select: {
              login: true,
            },
          },
          _count: {
            select: {
              candidateCases: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.caseTemplate.findMany({
        include: {
          reviewerAssignments: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              reviewerId: true,
            },
          },
          _count: {
            select: {
              candidateCases: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
      db.user.findMany({
        where: {
          role: UserRole.RECRUITER,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      }),
      getWorkspaceSettings(),
    ]);

  return {
    candidates: candidates
      .filter((candidate) => candidate.giteaIdentity?.login)
      .map<CandidateCaseAssignmentCandidateOption>((candidate) => ({
        id: candidate.id,
        displayName: candidate.name ?? candidate.email ?? "Unnamed candidate",
        email: candidate.email ?? "No email",
        giteaLogin: candidate.giteaIdentity?.login ?? "",
        caseCount: candidate._count.candidateCases,
      })),
    templates: templates.map<CandidateCaseAssignmentTemplateOption>(
      (template) => ({
        id: template.id,
        name: template.name,
        slug: template.slug,
        repositoryName: template.repositoryName,
        defaultBranch: template.defaultBranch,
        defaultReviewerIds: template.reviewerAssignments.map(
          (assignment) => assignment.reviewerId,
        ),
        assignmentCount: template._count.candidateCases,
      }),
    ),
    reviewers: reviewers.map<CandidateCaseAssignmentReviewerOption>(
      (reviewer) => ({
        id: reviewer.id,
        displayName: reviewer.name ?? reviewer.email ?? "Unnamed reviewer",
        email: reviewer.email ?? "No email",
      }),
    ),
    workspaceOrganization: workspaceSettings?.giteaOrganization ?? null,
  };
}

export async function getCandidateCaseById(
  candidateCaseId: string,
): Promise<CandidateCaseDetail | null> {
  await syncExpiredCandidateCompletions();
  const candidateCase = await db.candidateCase.findUnique({
    where: {
      id: candidateCaseId,
    },
    include: {
      candidate: {
        select: {
          name: true,
          email: true,
          giteaIdentity: {
            select: {
              login: true,
            },
          },
        },
      },
      caseTemplate: {
        select: {
          name: true,
          slug: true,
          summary: true,
          repositoryName: true,
          repositoryDescription: true,
          defaultBranch: true,
          reviewGuide: {
            select: {
              reviewerInstructions: true,
              decisionGuidance: true,
              rubricCriteria: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  title: true,
                  description: true,
                  weight: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      reviewerAssignments: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          reviewerId: true,
          reviewer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      evaluationNotes: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          score: true,
          summary: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      accessGrants: {
        orderBy: {
          grantedAt: "desc",
        },
        select: {
          id: true,
          repositoryName: true,
          permissionKey: true,
          canRead: true,
          canWrite: true,
          canOpenIssues: true,
          canOpenPullRequests: true,
          grantedAt: true,
          revokedAt: true,
        },
      },
    },
  });

  if (!candidateCase) {
    return null;
  }

  const workingRepository = candidateCase.workingRepository ?? null;
  const workspaceSettings = await getWorkspaceSettings();
  const repositoryOwner = workspaceSettings?.giteaOrganization ?? null;
  const repositoryResourceId =
    repositoryOwner && workingRepository
      ? `${repositoryOwner}/${workingRepository}`
      : null;

  const [auditLogs, webhookDeliveries, repositoryActivity] = await Promise.all([
    db.auditLog.findMany({
      where: {
        OR: [
          {
            resourceType: "CandidateCase",
            resourceId: candidateCase.id,
          },
          ...(repositoryResourceId
            ? [
                {
                  resourceType: "GiteaRepository",
                  resourceId: repositoryResourceId,
                },
                {
                  resourceType: "GiteaRepositoryWebhook",
                  resourceId: repositoryResourceId,
                },
              ]
            : []),
        ],
      },
      include: {
        actor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    }),
    workingRepository
      ? db.webhookDelivery.findMany({
          where: {
            payload: {
              path: ["repository", "name"],
              equals: workingRepository,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        })
      : Promise.resolve([]),
    getCandidateCaseRepositoryActivity({
      owner: repositoryOwner,
      repositoryName: workingRepository,
    }),
  ]);

  const latestNote = candidateCase.evaluationNotes[0];

  return {
    id: candidateCase.id,
    candidateId: candidateCase.candidateId,
    caseTemplateId: candidateCase.caseTemplateId,
    status: candidateCase.status,
    decision: candidateCase.decision ?? null,
    workingRepository,
    workingRepositoryUrl: candidateCase.workingRepositoryUrl ?? null,
    branchName: candidateCase.branchName ?? null,
    dueAt: candidateCase.dueAt ?? null,
    startedAt: candidateCase.startedAt ?? null,
    submittedAt: candidateCase.submittedAt ?? null,
    lastSyncedAt: candidateCase.lastSyncedAt ?? null,
    candidateCompletionRequestedAt:
      candidateCase.candidateCompletionRequestedAt ?? null,
    candidateCompletionLockedAt:
      candidateCase.candidateCompletionLockedAt ?? null,
    candidateCompletionSource: candidateCase.candidateCompletionSource ?? null,
    createdAt: candidateCase.createdAt,
    candidateDisplayName:
      candidateCase.candidate.name ??
      candidateCase.candidate.email ??
      "Unnamed candidate",
    candidateEmail: candidateCase.candidate.email ?? "No email",
    candidateLogin: candidateCase.candidate.giteaIdentity?.login ?? null,
    templateName: candidateCase.caseTemplate.name,
    templateSlug: candidateCase.caseTemplate.slug,
    createdByName:
      candidateCase.createdBy.name ??
      candidateCase.createdBy.email ??
      "Unknown owner",
    reviewerIds: candidateCase.reviewerAssignments.map(
      (assignment) => assignment.reviewerId,
    ),
    reviewerDisplayNames: candidateCase.reviewerAssignments.map(
      (assignment) =>
        assignment.reviewer.name ??
        assignment.reviewer.email ??
        "Unknown reviewer",
    ),
    reviewedAt: candidateCase.reviewedAt ?? null,
    templateSummary: candidateCase.caseTemplate.summary,
    templateRepositoryName: candidateCase.caseTemplate.repositoryName,
    templateRepositoryDescription:
      candidateCase.caseTemplate.repositoryDescription ?? null,
    templateDefaultBranch: candidateCase.caseTemplate.defaultBranch,
    templateReviewerInstructions:
      candidateCase.caseTemplate.reviewGuide?.reviewerInstructions ?? null,
    templateDecisionGuidance:
      candidateCase.caseTemplate.reviewGuide?.decisionGuidance ?? null,
    rubricCriteria:
      candidateCase.caseTemplate.reviewGuide?.rubricCriteria.map(
        (criterion) => ({
          id: criterion.id,
          title: criterion.title,
          description: criterion.description ?? null,
          weight: criterion.weight ?? null,
          sortOrder: criterion.sortOrder,
        }),
      ) ?? [],
    accessGrants: candidateCase.accessGrants.map((grant) => ({
      id: grant.id,
      repositoryName: grant.repositoryName,
      permissionKey: grant.permissionKey,
      canRead: grant.canRead,
      canWrite: grant.canWrite,
      canOpenIssues: grant.canOpenIssues,
      canOpenPullRequests: grant.canOpenPullRequests,
      grantedAt: grant.grantedAt,
      revokedAt: grant.revokedAt ?? null,
    })),
    reviewHistory: candidateCase.evaluationNotes.map((note) => ({
      id: note.id,
      score: note.score ?? null,
      summary: note.summary,
      note: note.note ?? null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      authorName: note.author.name ?? note.author.email ?? "Unknown reviewer",
    })),
    auditLogs: auditLogs.map((auditLog) => ({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId ?? null,
      detail: auditLog.detail,
      createdAt: auditLog.createdAt,
      actor: auditLog.actor,
    })),
    webhookDeliveries: webhookDeliveries.map((delivery) => ({
      id: delivery.id,
      deliveryId: delivery.deliveryId ?? null,
      eventName: delivery.eventName,
      action: getWebhookAction(delivery.payload),
      branchName: getWebhookBranchName(delivery.payload),
      repositoryName: getWebhookRepositoryName(delivery.payload),
      statusCode: delivery.statusCode ?? null,
      errorMessage: delivery.errorMessage ?? null,
      processedAt: delivery.processedAt ?? null,
      createdAt: delivery.createdAt,
    })),
    repositoryActivity,
    notesCount: candidateCase.evaluationNotes.length,
    latestScore: latestNote?.score ?? null,
    latestSummary: latestNote?.summary ?? null,
    latestReviewedAt: latestNote?.createdAt ?? null,
    latestReviewerName:
      latestNote?.author.name ?? latestNote?.author.email ?? null,
  };
}
