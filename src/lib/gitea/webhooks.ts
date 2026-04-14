import { CandidateCaseStatus, type Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { env, hasWebhookConfiguration } from "@/lib/env";
import { getGiteaAdminClient } from "@/lib/gitea/client";

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

async function persistWebhookDelivery(input: {
  deliveryId: string | null;
  eventName: string;
  payload: Prisma.InputJsonValue;
  processedAt: Date;
}) {
  if (input.deliveryId) {
    return db.webhookDelivery.upsert({
      where: {
        deliveryId: input.deliveryId,
      },
      update: {
        eventName: input.eventName,
        payload: input.payload,
        statusCode: 200,
        errorMessage: null,
        processedAt: input.processedAt,
      },
      create: {
        deliveryId: input.deliveryId,
        eventName: input.eventName,
        payload: input.payload,
        statusCode: 200,
        errorMessage: null,
        processedAt: input.processedAt,
      },
    });
  }

  return db.webhookDelivery.create({
    data: {
      eventName: input.eventName,
      payload: input.payload,
      statusCode: 200,
      errorMessage: null,
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
  let candidateCaseSync:
    | {
        id: string;
        previousStatus: CandidateCaseStatus;
        nextStatus: CandidateCaseStatus;
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
      },
    });

    if (candidateCase) {
      const shouldMarkStarted =
        input.eventName === "push" || input.eventName === "pull_request";
      const nextStatus =
        shouldMarkStarted && candidateCase.status === CandidateCaseStatus.READY
          ? CandidateCaseStatus.IN_PROGRESS
          : candidateCase.status;

      await db.candidateCase.update({
        where: {
          id: candidateCase.id,
        },
        data: {
          lastSyncedAt: processedAt,
          startedAt:
            shouldMarkStarted && !candidateCase.startedAt
              ? processedAt
              : candidateCase.startedAt,
          status: nextStatus,
        },
      });

      candidateCaseSync = {
        id: candidateCase.id,
        previousStatus: candidateCase.status,
        nextStatus,
      };
    }
  }

  const delivery = await persistWebhookDelivery({
    deliveryId: input.deliveryId,
    eventName: input.eventName,
    payload: input.payload as Prisma.InputJsonValue,
    processedAt,
  });

  await createAuditLog({
    action: "gitea.webhook.received",
    resourceType: "WebhookDelivery",
    resourceId: delivery.id,
    detail: {
      deliveryId: input.deliveryId,
      eventName: input.eventName,
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
        repositoryName,
        previousStatus: candidateCaseSync.previousStatus,
        nextStatus: candidateCaseSync.nextStatus,
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
