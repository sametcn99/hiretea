import { WorkspaceGiteaMode } from "@prisma/client";
import { db } from "@/lib/db";
import {
  env,
  getDeploymentGiteaMode,
  hasConfigEncryptionKey,
  type DeploymentGiteaMode,
} from "@/lib/env";
import { decryptExternalGiteaSecret } from "@/lib/gitea/secret-store";

type PersistedWorkspaceGiteaConfig = {
  id: string;
  giteaMode: WorkspaceGiteaMode;
  giteaBaseUrl: string;
  giteaAdminBaseUrl: string | null;
  giteaOrganization: string;
  giteaAuthClientId: string | null;
  giteaConfigSecret: {
    authClientSecretEncrypted: string | null;
    adminTokenEncrypted: string | null;
    webhookSecretEncrypted: string | null;
  } | null;
};

export type GiteaRuntimeConfig = {
  mode: DeploymentGiteaMode;
  source: "env" | "database";
  workspaceSettingsId: string | null;
  nextAuthSecret: string | null;
  appBaseUrl: string | null;
  publicBaseUrl: string | null;
  adminBaseUrl: string | null;
  organization: string | null;
  authClientId: string | null;
  authClientSecret: string | null;
  adminToken: string | null;
  webhookSecret: string | null;
};

export type GiteaRuntimeReadiness = {
  mode: DeploymentGiteaMode;
  source: "env" | "database";
  workspaceConfigured: boolean;
  hasBootstrapToken: boolean;
  hasNextAuthSecret: boolean;
  hasAppUrl: boolean;
  hasConfigEncryptionKey: boolean;
  authReady: boolean;
  adminReady: boolean;
  webhookReady: boolean;
};

async function getPersistedWorkspaceGiteaConfig(): Promise<PersistedWorkspaceGiteaConfig | null> {
  return db.workspaceSettings.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
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
}

function decryptPersistedSecret(value: string | null) {
  if (!value || !hasConfigEncryptionKey()) {
    return null;
  }

  return decryptExternalGiteaSecret(value);
}

function getBundledRuntimeConfig(): GiteaRuntimeConfig {
  return {
    mode: "bundled",
    source: "env",
    workspaceSettingsId: null,
    nextAuthSecret: env.NEXTAUTH_SECRET ?? null,
    appBaseUrl: env.NEXTAUTH_URL ?? null,
    publicBaseUrl: env.AUTH_GITEA_ISSUER ?? null,
    adminBaseUrl: env.GITEA_ADMIN_BASE_URL ?? null,
    organization: env.GITEA_ORGANIZATION_NAME ?? null,
    authClientId: env.AUTH_GITEA_ID ?? null,
    authClientSecret: env.AUTH_GITEA_SECRET ?? null,
    adminToken: env.GITEA_ADMIN_TOKEN ?? null,
    webhookSecret: env.GITEA_WEBHOOK_SECRET ?? null,
  };
}

async function getExternalRuntimeConfig(): Promise<GiteaRuntimeConfig> {
  const persistedConfig = await getPersistedWorkspaceGiteaConfig();

  if (!persistedConfig || persistedConfig.giteaMode !== WorkspaceGiteaMode.EXTERNAL) {
    return {
      mode: "external",
      source: "database",
      workspaceSettingsId: persistedConfig?.id ?? null,
      nextAuthSecret: env.NEXTAUTH_SECRET ?? null,
      appBaseUrl: env.NEXTAUTH_URL ?? null,
      publicBaseUrl: null,
      adminBaseUrl: null,
      organization: null,
      authClientId: null,
      authClientSecret: null,
      adminToken: null,
      webhookSecret: null,
    };
  }

  return {
    mode: "external",
    source: "database",
    workspaceSettingsId: persistedConfig.id,
    nextAuthSecret: env.NEXTAUTH_SECRET ?? null,
    appBaseUrl: env.NEXTAUTH_URL ?? null,
    publicBaseUrl: persistedConfig.giteaBaseUrl,
    adminBaseUrl:
      persistedConfig.giteaAdminBaseUrl || persistedConfig.giteaBaseUrl,
    organization: persistedConfig.giteaOrganization,
    authClientId: persistedConfig.giteaAuthClientId,
    authClientSecret: decryptPersistedSecret(
      persistedConfig.giteaConfigSecret?.authClientSecretEncrypted ?? null,
    ),
    adminToken: decryptPersistedSecret(
      persistedConfig.giteaConfigSecret?.adminTokenEncrypted ?? null,
    ),
    webhookSecret: decryptPersistedSecret(
      persistedConfig.giteaConfigSecret?.webhookSecretEncrypted ?? null,
    ),
  };
}

export async function getGiteaRuntimeConfig(): Promise<GiteaRuntimeConfig> {
  if (getDeploymentGiteaMode() === "bundled") {
    return getBundledRuntimeConfig();
  }

  return getExternalRuntimeConfig();
}

export async function getGiteaRuntimeReadiness(): Promise<GiteaRuntimeReadiness> {
  const config = await getGiteaRuntimeConfig();

  return {
    mode: config.mode,
    source: config.source,
    workspaceConfigured: Boolean(config.workspaceSettingsId),
    hasBootstrapToken: Boolean(env.BOOTSTRAP_TOKEN),
    hasNextAuthSecret: Boolean(config.nextAuthSecret),
    hasAppUrl: Boolean(config.appBaseUrl),
    hasConfigEncryptionKey:
      config.mode === "bundled" ? true : hasConfigEncryptionKey(),
    authReady: Boolean(
      config.nextAuthSecret &&
        config.publicBaseUrl &&
        config.authClientId &&
        config.authClientSecret,
    ),
    adminReady: Boolean(
      config.adminBaseUrl && config.adminToken && config.organization,
    ),
    webhookReady: Boolean(config.appBaseUrl && config.webhookSecret),
  };
}

export async function getResolvedGiteaAuthConfig() {
  const config = await getGiteaRuntimeConfig();

  if (
    !config.nextAuthSecret ||
    !config.publicBaseUrl ||
    !config.authClientId ||
    !config.authClientSecret
  ) {
    throw new Error("Gitea OAuth configuration is incomplete.");
  }

  return {
    clientId: config.authClientId,
    clientSecret: config.authClientSecret,
    issuer: config.publicBaseUrl,
    internalBaseUrl: config.adminBaseUrl ?? config.publicBaseUrl,
    nextAuthSecret: config.nextAuthSecret,
  };
}

export async function getResolvedGiteaAdminConfig() {
  const config = await getGiteaRuntimeConfig();

  if (!config.adminBaseUrl || !config.adminToken || !config.organization) {
    throw new Error("Gitea admin configuration is incomplete.");
  }

  return {
    baseUrl: config.adminBaseUrl,
    token: config.adminToken,
    organization: config.organization,
  };
}

export async function getResolvedGiteaWebhookConfig() {
  const config = await getGiteaRuntimeConfig();

  if (!config.appBaseUrl || !config.webhookSecret) {
    throw new Error("Webhook runtime configuration is incomplete.");
  }

  return {
    callbackUrl: `${config.appBaseUrl.replace(/\/$/, "")}/api/webhooks/gitea`,
    secret: config.webhookSecret,
  };
}

export async function hasResolvedWebhookConfiguration() {
  const readiness = await getGiteaRuntimeReadiness();
  return readiness.webhookReady;
}