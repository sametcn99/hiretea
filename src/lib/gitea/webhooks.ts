import { CandidateCaseStatus, type Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { getGiteaAdminClient } from "@/lib/gitea/client";
import {
  getResolvedGiteaWebhookConfig,
  hasResolvedWebhookConfiguration,
} from "@/lib/gitea/runtime-config";

const submissionActions = new Set([
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
]);

const ignoredPullRequestActions = new Set(["closed", "converted_to_draft"]);

const supportedWebhookEvents = new Set(["push", "pull_request", "issues"]);

type GiteaRepositoryWebhook = {
  id: number;
  config?: {
    url?: string;
  };
};

type EnsureRepositoryWebhookInput = {
  actorId: string;
  owner: string;
  repositoryName: string;
};

type ProcessGiteaWebhookDeliveryInput = {
  deliveryId: string;
  eventName: string;
  payload: unknown;
};

type WebhookTransitionIntent = {
  shouldMarkStarted: boolean;
  shouldMarkSubmitted: boolean;
  skipReason: string | null;
};

export function isSupportedWebhookEvent(eventName: string) {
  return supportedWebhookEvents.has(eventName);
}

function getRepositoryNameFromPayload(payload: unknown) {
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

function getEventAction(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const action = (payload as { action?: unknown }).action;

  return typeof action === "string" ? action : null;
}

function getBranchNameFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const ref = (payload as { ref?: unknown }).ref;

  if (typeof ref !== "string") {
    return null;
  }

  return ref.startsWith("refs/heads/") ? ref.replace("refs/heads/", "") : ref;
}

function getNextCandidateCaseStatus(input: {
  currentStatus: CandidateCaseStatus;
  shouldMarkStarted: boolean;
  shouldMarkSubmitted: boolean;
}) {
  if (input.currentStatus === CandidateCaseStatus.COMPLETED) {
    return CandidateCaseStatus.COMPLETED;
  }

  if (
    input.shouldMarkSubmitted &&
    (input.currentStatus === CandidateCaseStatus.READY ||
      input.currentStatus === CandidateCaseStatus.IN_PROGRESS)
  ) {
    return CandidateCaseStatus.REVIEWING;
  }

  if (
    input.shouldMarkStarted &&
    input.currentStatus === CandidateCaseStatus.READY
  ) {
    return CandidateCaseStatus.IN_PROGRESS;
  }

  return input.currentStatus;
}

function getWebhookTransitionIntent(input: {
  eventName: string;
  eventAction: string | null;
  branchName: string | null;
}): WebhookTransitionIntent {
  if (input.eventName === "push") {
    return {
      shouldMarkStarted: Boolean(input.branchName),
      shouldMarkSubmitted: false,
      skipReason: input.branchName ? null : "missing-branch-name",
    };
  }

  if (input.eventName === "pull_request") {
    if (!input.eventAction) {
      return {
        shouldMarkStarted: false,
        shouldMarkSubmitted: false,
        skipReason: "missing-pull-request-action",
      };
    }

    if (submissionActions.has(input.eventAction)) {
      return {
        shouldMarkStarted: true,
        shouldMarkSubmitted: true,
        skipReason: null,
      };
    }

    if (ignoredPullRequestActions.has(input.eventAction)) {
      return {
        shouldMarkStarted: false,
        shouldMarkSubmitted: false,
        skipReason: `ignored-pull-request-action:${input.eventAction}`,
      };
    }

    return {
      shouldMarkStarted: false,
      shouldMarkSubmitted: false,
      skipReason: `unsupported-pull-request-action:${input.eventAction}`,
    };
  }

  return {
    shouldMarkStarted: false,
    shouldMarkSubmitted: false,
    skipReason: "non-stateful-event",
  };
}

async function persistWebhookDelivery(input: {
  deliveryId: string;
  eventName: string;
  payload: Prisma.InputJsonValue;
  processedAt: Date;
  statusCode: number;
  errorMessage: string | null;
}) {
  return db.webhookDelivery.upsert({
    where: {
      deliveryId: input.deliveryId,
    },
    update: {
      eventName: input.eventName,
      payload: input.payload,
      statusCode: input.statusCode,
      errorMessage: input.errorMessage,
      processedAt: input.processedAt,
    },
    create: {
      deliveryId: input.deliveryId,
      eventName: input.eventName,
      payload: input.payload,
      statusCode: input.statusCode,
      errorMessage: input.errorMessage,
      processedAt: input.processedAt,
    },
  });
}

export async function ensureRepositoryWebhook(
  input: EnsureRepositoryWebhookInput,
) {
  const { callbackUrl, secret } = await getResolvedGiteaWebhookConfig();
  const client = await getGiteaAdminClient();

  const existingHooks = await client.request<GiteaRepositoryWebhook[]>(
    `/repos/${input.owner}/${input.repositoryName}/hooks`,
  );

  const existingHook = existingHooks.find(
    (hook) => hook.config?.url === callbackUrl,
  );

  if (existingHook) {
    return existingHook;
  }

  const webhook = await client.request<GiteaRepositoryWebhook>(
    `/repos/${input.owner}/${input.repositoryName}/hooks`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "gitea",
        config: {
          url: callbackUrl,
          content_type: "json",
          secret,
          http_method: "post",
        },
        events: ["push", "pull_request", "issues"],
        active: true,
      }),
    },
  );

  await createAuditLog({
    action: "candidate.case.repository.webhook.registered",
    actorId: input.actorId,
    resourceType: "GiteaRepositoryWebhook",
    resourceId: `${input.owner}/${input.repositoryName}#${webhook.id}`,
    detail: {
      repositoryName: input.repositoryName,
      callbackUrl,
    },
  });

  return webhook;
}

export async function processGiteaWebhookDelivery(
  input: ProcessGiteaWebhookDeliveryInput,
) {
  const processedAt = new Date();

  const existingDelivery = await db.webhookDelivery.findUnique({
    where: {
      deliveryId: input.deliveryId,
    },
    select: {
      id: true,
      statusCode: true,
      processedAt: true,
    },
  });

  if (existingDelivery?.statusCode && existingDelivery.statusCode < 400) {
    await createAuditLog({
      action: "gitea.webhook.duplicate.ignored",
      resourceType: "WebhookDelivery",
      resourceId: existingDelivery.id,
      detail: {
        deliveryId: input.deliveryId,
        eventName: input.eventName,
        previousStatusCode: existingDelivery.statusCode,
      },
    });

    return {
      deliveryId: existingDelivery.id,
      candidateCaseId: null,
      duplicate: true,
    };
  }

  const repositoryName = getRepositoryNameFromPayload(input.payload);
  const eventAction = getEventAction(input.payload);
  const branchName = getBranchNameFromPayload(input.payload);
  const transitionIntent = getWebhookTransitionIntent({
    eventName: input.eventName,
    eventAction,
    branchName,
  });
  let candidateCaseSync:
    | {
        id: string;
        previousStatus: CandidateCaseStatus;
        nextStatus: CandidateCaseStatus;
        startedAtRecorded: boolean;
        submittedAtRecorded: boolean;
      }
    | undefined;

  if (repositoryName) {
    const candidateCase = await db.candidateCase.findFirst({
      where: {
        workingRepository: repositoryName,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        accessGrants: {
          where: {
            revokedAt: null,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (candidateCase) {
      if (candidateCase.accessGrants.length === 0) {
        const delivery = await persistWebhookDelivery({
          deliveryId: input.deliveryId,
          eventName: input.eventName,
          payload: input.payload as Prisma.InputJsonValue,
          processedAt,
          statusCode: 202,
          errorMessage:
            "Ignored because the candidate case has no active access grant.",
        });

        await createAuditLog({
          action: "candidate.case.sync.skipped",
          resourceType: "CandidateCase",
          resourceId: candidateCase.id,
          detail: {
            deliveryId: input.deliveryId,
            eventName: input.eventName,
            eventAction,
            branchName,
            repositoryName,
            reason: "no-active-access-grant",
          },
        });

        return {
          deliveryId: delivery.id,
          candidateCaseId: candidateCase.id,
          duplicate: false,
        };
      }

      if (transitionIntent.skipReason) {
        const delivery = await persistWebhookDelivery({
          deliveryId: input.deliveryId,
          eventName: input.eventName,
          payload: input.payload as Prisma.InputJsonValue,
          processedAt,
          statusCode: 202,
          errorMessage: `Ignored because ${transitionIntent.skipReason}.`,
        });

        await createAuditLog({
          action: "candidate.case.sync.skipped",
          resourceType: "CandidateCase",
          resourceId: candidateCase.id,
          detail: {
            deliveryId: input.deliveryId,
            eventName: input.eventName,
            eventAction,
            branchName,
            repositoryName,
            reason: transitionIntent.skipReason,
          },
        });

        return {
          deliveryId: delivery.id,
          candidateCaseId: candidateCase.id,
          duplicate: false,
        };
      }

      const nextStatus = getNextCandidateCaseStatus({
        currentStatus: candidateCase.status,
        shouldMarkStarted: transitionIntent.shouldMarkStarted,
        shouldMarkSubmitted: transitionIntent.shouldMarkSubmitted,
      });
      const nextStartedAt =
        transitionIntent.shouldMarkStarted && !candidateCase.startedAt
          ? processedAt
          : candidateCase.startedAt;
      const nextSubmittedAt =
        transitionIntent.shouldMarkSubmitted && !candidateCase.submittedAt
          ? processedAt
          : candidateCase.submittedAt;

      await db.candidateCase.update({
        where: {
          id: candidateCase.id,
        },
        data: {
          lastSyncedAt: processedAt,
          startedAt: nextStartedAt,
          submittedAt: nextSubmittedAt,
          status: nextStatus,
        },
      });

      candidateCaseSync = {
        id: candidateCase.id,
        previousStatus: candidateCase.status,
        nextStatus,
        startedAtRecorded: Boolean(
          transitionIntent.shouldMarkStarted &&
            !candidateCase.startedAt &&
            nextStartedAt,
        ),
        submittedAtRecorded: Boolean(
          transitionIntent.shouldMarkSubmitted &&
            !candidateCase.submittedAt &&
            nextSubmittedAt,
        ),
      };
    }
  }

  const delivery = await persistWebhookDelivery({
    deliveryId: input.deliveryId,
    eventName: input.eventName,
    payload: input.payload as Prisma.InputJsonValue,
    processedAt,
    statusCode: 200,
    errorMessage: null,
  });

  await createAuditLog({
    action: "gitea.webhook.received",
    resourceType: "WebhookDelivery",
    resourceId: delivery.id,
    detail: {
      deliveryId: input.deliveryId,
      eventName: input.eventName,
      eventAction,
      branchName,
      repositoryName,
      candidateCaseId: candidateCaseSync?.id ?? null,
    },
  });

  if (candidateCaseSync) {
    await createAuditLog({
      action: "candidate.case.sync.updated",
      resourceType: "CandidateCase",
      resourceId: candidateCaseSync.id,
      detail: {
        deliveryId: input.deliveryId,
        eventName: input.eventName,
        eventAction,
        branchName,
        repositoryName,
        previousStatus: candidateCaseSync.previousStatus,
        nextStatus: candidateCaseSync.nextStatus,
        startedAtRecorded: candidateCaseSync.startedAtRecorded,
        submittedAtRecorded: candidateCaseSync.submittedAtRecorded,
      },
    });
  }

  return {
    deliveryId: delivery.id,
    candidateCaseId: candidateCaseSync?.id ?? null,
    duplicate: false,
  };
}

export async function canRegisterRepositoryWebhook() {
  return hasResolvedWebhookConfiguration();
}

export async function recordFailedGiteaWebhookDelivery(input: {
  deliveryId: string;
  eventName: string;
  payload: unknown;
  errorMessage: string;
  statusCode?: number;
}) {
  const processedAt = new Date();
  const repositoryName = getRepositoryNameFromPayload(input.payload);
  const eventAction = getEventAction(input.payload);
  const branchName = getBranchNameFromPayload(input.payload);
  const delivery = await persistWebhookDelivery({
    deliveryId: input.deliveryId,
    eventName: input.eventName,
    payload: input.payload as Prisma.InputJsonValue,
    processedAt,
    statusCode: input.statusCode ?? 500,
    errorMessage: input.errorMessage,
  });

  await createAuditLog({
    action: "gitea.webhook.failed",
    resourceType: "WebhookDelivery",
    resourceId: delivery.id,
    detail: {
      deliveryId: input.deliveryId,
      eventName: input.eventName,
      eventAction,
      branchName,
      repositoryName,
      errorMessage: input.errorMessage,
    },
  });

  return delivery;
}
