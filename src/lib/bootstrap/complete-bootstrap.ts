import type { Prisma } from "@prisma/client";
import { UserRole, WorkspaceGiteaMode } from "@prisma/client";
import type { BootstrapSetupInput } from "@/lib/bootstrap/schemas";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { encryptExternalGiteaSecret } from "@/lib/gitea/secret-store";

type BootstrapResult = {
  adminEmail: string;
  companyName: string;
};

export type WorkspaceBootstrapInput = Omit<
  BootstrapSetupInput,
  "bootstrapToken"
>;

async function applyWorkspaceBootstrap(
  transaction: Prisma.TransactionClient,
  input: WorkspaceBootstrapInput,
  auditAction: string,
  existingSettingsId?: string,
): Promise<BootstrapResult> {
  const giteaMode =
    input.giteaMode === "external"
      ? WorkspaceGiteaMode.EXTERNAL
      : WorkspaceGiteaMode.BUNDLED;
  const adminUser = await transaction.user.upsert({
    where: {
      email: input.adminEmail,
    },
    update: {
      name: input.adminName,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      name: input.adminName,
      email: input.adminEmail,
      role: UserRole.ADMIN,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
    },
  });

  const settingsData = {
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
  };

  const workspaceSettings = existingSettingsId
    ? await transaction.workspaceSettings.update({
        where: {
          id: existingSettingsId,
        },
        data: settingsData,
        select: {
          id: true,
          companyName: true,
          giteaBaseUrl: true,
          giteaAdminBaseUrl: true,
          giteaOrganization: true,
        },
      })
    : await transaction.workspaceSettings.create({
        data: settingsData,
        select: {
          id: true,
          companyName: true,
          giteaBaseUrl: true,
          giteaAdminBaseUrl: true,
          giteaOrganization: true,
        },
      });

  if (input.giteaMode === "external") {
    await transaction.workspaceGiteaConfigSecret.upsert({
      where: {
        workspaceSettingsId: workspaceSettings.id,
      },
      update: {
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
      create: {
        workspaceSettingsId: workspaceSettings.id,
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

  await transaction.auditLog.create({
    data: {
      action: auditAction,
      actorId: adminUser.id,
      resourceType: "WorkspaceSettings",
      resourceId: workspaceSettings.id,
      detail: {
        adminEmail: adminUser.email ?? input.adminEmail,
        companyName: workspaceSettings.companyName,
        giteaMode: input.giteaMode,
        giteaBaseUrl: workspaceSettings.giteaBaseUrl,
        giteaAdminBaseUrl: workspaceSettings.giteaAdminBaseUrl,
        giteaOrganization: workspaceSettings.giteaOrganization,
        hasExternalConnectionSecrets: input.giteaMode === "external",
        defaultBranch: input.defaultBranch,
        manualInviteMode: true,
      },
    },
  });

  return {
    adminEmail: adminUser.email ?? input.adminEmail,
    companyName: workspaceSettings.companyName,
  };
}

export async function ensureWorkspaceBootstrap(
  input: WorkspaceBootstrapInput,
): Promise<BootstrapResult> {
  return db.$transaction(async (transaction) => {
    const adminCount = await transaction.user.count({
      where: {
        role: UserRole.ADMIN,
      },
    });

    const existingSettings = await transaction.workspaceSettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        companyName: true,
      },
    });

    if (adminCount > 0 && existingSettings) {
      return {
        adminEmail: input.adminEmail,
        companyName: existingSettings.companyName,
      };
    }

    return applyWorkspaceBootstrap(
      transaction,
      input,
      "workspace.bootstrap.auto.completed",
      existingSettings?.id,
    );
  });
}

export async function completeBootstrapSetup(
  input: BootstrapSetupInput,
): Promise<BootstrapResult> {
  if (!env.BOOTSTRAP_TOKEN) {
    throw new Error(
      "BOOTSTRAP_TOKEN is not configured in the application environment.",
    );
  }

  if (input.bootstrapToken !== env.BOOTSTRAP_TOKEN) {
    throw new Error("The bootstrap token is invalid.");
  }

  return db.$transaction(async (transaction) => {
    const adminCount = await transaction.user.count({
      where: {
        role: UserRole.ADMIN,
      },
    });

    if (adminCount > 0) {
      throw new Error("The workspace is already initialized.");
    }

    const existingSettings = await transaction.workspaceSettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    return applyWorkspaceBootstrap(
      transaction,
      input,
      "workspace.bootstrap.completed",
      existingSettings?.id,
    );
  });
}
