import { env } from "@/lib/env";

export type GiteaRuntimeConfig = {
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
  hasBootstrapToken: boolean;
  hasNextAuthSecret: boolean;
  hasAppUrl: boolean;
  authReady: boolean;
  adminReady: boolean;
  migrationReady: boolean;
  webhookReady: boolean;
};

function resolveMigrationBaseUrl(config: GiteaRuntimeConfig) {
  return config.adminBaseUrl;
}

export async function getGiteaRuntimeConfig(): Promise<GiteaRuntimeConfig> {
  return {
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

export async function getGiteaRuntimeReadiness(): Promise<GiteaRuntimeReadiness> {
  const config = await getGiteaRuntimeConfig();
  const migrationBaseUrl = resolveMigrationBaseUrl(config);

  return {
    hasBootstrapToken: Boolean(env.BOOTSTRAP_TOKEN),
    hasNextAuthSecret: Boolean(config.nextAuthSecret),
    hasAppUrl: Boolean(config.appBaseUrl),
    authReady: Boolean(
      config.nextAuthSecret &&
        config.publicBaseUrl &&
        config.authClientId &&
        config.authClientSecret,
    ),
    adminReady: Boolean(
      config.adminBaseUrl && config.adminToken && config.organization,
    ),
    migrationReady: Boolean(
      migrationBaseUrl && config.adminToken && config.organization,
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

export async function getResolvedGiteaMigrationConfig() {
  const config = await getGiteaRuntimeConfig();
  const baseUrl = resolveMigrationBaseUrl(config);

  if (!baseUrl || !config.adminToken || !config.organization) {
    throw new Error("Gitea repository migration configuration is incomplete.");
  }

  return {
    baseUrl,
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
