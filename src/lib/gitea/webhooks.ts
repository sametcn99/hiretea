import { CandidateCaseStatus, type Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { env, hasWebhookConfiguration } from "@/lib/env";
import { getGiteaAdminClient } from "@/lib/gitea/client";

const submissionActions = new Set([
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
]);

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
  deliveryId: string | null;
  eventName: string;
  payload: unknown;
};

function getWebhookTargetUrl() {
  if (!env.NEXTAUTH_URL || !env.GITEA_WEBHOOK_SECRET) {
    throw new Error("Webhook runtime configuration is incomplete.");
  }

  return {
    callbackUrl: `${env.NEXTAUTH_URL.replace(/\/$/, "")}/api/webhooks/gitea`,
    secret: env.GITEA_WEBHOOK_SECRET,
  };
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

async function persistWebhookDelivery(input: {
  deliveryId: string | null;
  eventName: string;
  payload: Prisma.InputJsonValue;
  processedAt: Date;
  statusCode: number;
  errorMessage: string | null;
}) {
  if (input.deliveryId) {
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

  return db.webhookDelivery.create({
    data: {
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
  const { callbackUrl, secret } = getWebhookTargetUrl();
  const client = getGiteaAdminClient();

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
  const repositoryName = getRepositoryNameFromPayload(input.payload);
  const eventAction = getEventAction(input.payload);
  const branchName = getBranchNameFromPayload(input.payload);
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
      },
    });

    if (candidateCase) {
      const shouldMarkStarted =
        input.eventName === "push" ||
        (input.eventName === "pull_request" &&
          eventAction !== "closed" &&
          eventAction !== "converted_to_draft");
      const shouldMarkSubmitted =
        input.eventName === "pull_request" &&
        (eventAction == null || submissionActions.has(eventAction));
      const nextStatus = getNextCandidateCaseStatus({
        currentStatus: candidateCase.status,
        shouldMarkStarted,
        shouldMarkSubmitted,
      });
      const nextStartedAt =
        shouldMarkStarted && !candidateCase.startedAt
          ? processedAt
          : candidateCase.startedAt;
      const nextSubmittedAt =
        shouldMarkSubmitted && !candidateCase.submittedAt
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
          shouldMarkStarted && !candidateCase.startedAt && nextStartedAt,
        ),
        submittedAtRecorded: Boolean(
          shouldMarkSubmitted && !candidateCase.submittedAt && nextSubmittedAt,
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
  };
}

export function canRegisterRepositoryWebhook() {
  return hasWebhookConfiguration();
}

export async function recordFailedGiteaWebhookDelivery(input: {
  deliveryId: string | null;
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
