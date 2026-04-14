import { WorkspaceGiteaMode } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { encryptExternalGiteaSecret } from "@/lib/gitea/secret-store";
import type { WorkspaceSettingsUpdateInput } from "@/lib/workspace-settings/schemas";

type UpdateWorkspaceSettingsParams = WorkspaceSettingsUpdateInput & {
  actorId: string;
};

export async function updateWorkspaceSettings(
  input: UpdateWorkspaceSettingsParams,
) {
  const currentSettings = await db.workspaceSettings.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      companyName: true,
      defaultBranch: true,
      manualInviteMode: true,
      giteaMode: true,
      giteaBaseUrl: true,
      giteaAdminBaseUrl: true,
      giteaOrganization: true,
      giteaAuthClientId: true,
      giteaConfigSecret: {
        select: {
          authClientSecretEncrypted: true,
          adminTokenEncrypted: true,
          webhookSecretEncrypted: true,
        },
      },
    },
  });

  if (!currentSettings) {
    throw new Error(
      "Workspace settings are missing. Complete the first-run setup before editing them.",
    );
  }

  const giteaMode =
    input.giteaMode === "external"
      ? WorkspaceGiteaMode.EXTERNAL
      : WorkspaceGiteaMode.BUNDLED;

  const nextSettings = await db.workspaceSettings.update({
    where: {
      id: currentSettings.id,
    },
    data: {
      companyName: input.companyName,
      defaultBranch: input.defaultBranch,
      manualInviteMode: true,
      giteaMode,
      giteaBaseUrl: input.giteaBaseUrl,
      giteaAdminBaseUrl:
        input.giteaAdminBaseUrl ??
        (input.giteaMode === "external" ? input.giteaBaseUrl : null),
      giteaOrganization: input.giteaOrganization,
      giteaAuthClientId: input.giteaAuthClientId ?? null,
    },
    select: {
      id: true,
      companyName: true,
      defaultBranch: true,
      manualInviteMode: true,
      giteaMode: true,
      giteaBaseUrl: true,
      giteaAdminBaseUrl: true,
      giteaOrganization: true,
      giteaAuthClientId: true,
      updatedAt: true,
    },
  });

  if (input.giteaMode === "external") {
    await db.workspaceGiteaConfigSecret.upsert({
      where: {
        workspaceSettingsId: currentSettings.id,
      },
      update: {
        authClientSecretEncrypted: input.giteaAuthClientSecret
          ? encryptExternalGiteaSecret(input.giteaAuthClientSecret)
          : (currentSettings.giteaConfigSecret?.authClientSecretEncrypted ??
            null),
        adminTokenEncrypted: input.giteaAdminToken
          ? encryptExternalGiteaSecret(input.giteaAdminToken)
          : (currentSettings.giteaConfigSecret?.adminTokenEncrypted ?? null),
        webhookSecretEncrypted: input.giteaWebhookSecret
          ? encryptExternalGiteaSecret(input.giteaWebhookSecret)
          : (currentSettings.giteaConfigSecret?.webhookSecretEncrypted ?? null),
      },
      create: {
        workspaceSettingsId: currentSettings.id,
        authClientSecretEncrypted: input.giteaAuthClientSecret
          ? encryptExternalGiteaSecret(input.giteaAuthClientSecret)
          : null,
        adminTokenEncrypted: input.giteaAdminToken
          ? encryptExternalGiteaSecret(input.giteaAdminToken)
          : null,
        webhookSecretEncrypted: input.giteaWebhookSecret
          ? encryptExternalGiteaSecret(input.giteaWebhookSecret)
          : null,
      },
    });
  }

  await createAuditLog({
    action: "workspace.settings.updated",
    actorId: input.actorId,
    resourceType: "WorkspaceSettings",
    resourceId: nextSettings.id,
    detail: {
      previous: {
        companyName: currentSettings.companyName,
        defaultBranch: currentSettings.defaultBranch,
        manualInviteMode: currentSettings.manualInviteMode,
        giteaMode:
          currentSettings.giteaMode === WorkspaceGiteaMode.EXTERNAL
            ? "external"
            : "bundled",
        giteaBaseUrl: currentSettings.giteaBaseUrl,
        giteaAdminBaseUrl: currentSettings.giteaAdminBaseUrl,
        giteaOrganization: currentSettings.giteaOrganization,
        giteaAuthClientId: currentSettings.giteaAuthClientId,
        hasStoredExternalSecrets: Boolean(currentSettings.giteaConfigSecret),
      },
      next: {
        companyName: nextSettings.companyName,
        defaultBranch: nextSettings.defaultBranch,
        manualInviteMode: true,
        giteaMode: input.giteaMode,
        giteaBaseUrl: nextSettings.giteaBaseUrl,
        giteaAdminBaseUrl: nextSettings.giteaAdminBaseUrl,
        giteaOrganization: nextSettings.giteaOrganization,
        giteaAuthClientId: nextSettings.giteaAuthClientId,
        hasStoredExternalSecrets: input.giteaMode === "external",
      },
    },
  });

  return nextSettings;
}
