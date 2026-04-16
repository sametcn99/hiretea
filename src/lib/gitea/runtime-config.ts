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

export type GiteaRuntimeConfigSource = {
  NEXTAUTH_SECRET?: string | null;
  NEXTAUTH_URL?: string | null;
  AUTH_GITEA_ISSUER?: string | null;
  GITEA_ADMIN_BASE_URL?: string | null;
  GITEA_ORGANIZATION_NAME?: string | null;
  AUTH_GITEA_ID?: string | null;
  AUTH_GITEA_SECRET?: string | null;
  GITEA_ADMIN_TOKEN?: string | null;
  GITEA_WEBHOOK_SECRET?: string | null;
};

function resolveMigrationBaseUrl(config: GiteaRuntimeConfig) {
  return config.adminBaseUrl;
}

export function resolveGiteaRuntimeConfig(
  source: GiteaRuntimeConfigSource,
): GiteaRuntimeConfig {
  return {
    nextAuthSecret: source.NEXTAUTH_SECRET ?? null,
    appBaseUrl: source.NEXTAUTH_URL ?? null,
    publicBaseUrl: source.AUTH_GITEA_ISSUER ?? null,
    adminBaseUrl: source.GITEA_ADMIN_BASE_URL ?? null,
    organization: source.GITEA_ORGANIZATION_NAME ?? null,
    authClientId: source.AUTH_GITEA_ID ?? null,
    authClientSecret: source.AUTH_GITEA_SECRET ?? null,
    adminToken: source.GITEA_ADMIN_TOKEN ?? null,
    webhookSecret: source.GITEA_WEBHOOK_SECRET ?? null,
  };
}

export function evaluateGiteaRuntimeReadiness(
  config: GiteaRuntimeConfig,
  bootstrapToken: string | null | undefined,
): GiteaRuntimeReadiness {
  const migrationBaseUrl = resolveMigrationBaseUrl(config);

  return {
    hasBootstrapToken: Boolean(bootstrapToken),
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

export function resolveGiteaAuthConfig(config: GiteaRuntimeConfig) {
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

export function resolveGiteaAdminConfig(config: GiteaRuntimeConfig) {
  if (!config.adminBaseUrl || !config.adminToken || !config.organization) {
    throw new Error("Gitea admin configuration is incomplete.");
  }

  return {
    baseUrl: config.adminBaseUrl,
    token: config.adminToken,
    organization: config.organization,
  };
}

export function resolveGiteaMigrationConfig(config: GiteaRuntimeConfig) {
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

export function resolveGiteaWebhookConfig(config: GiteaRuntimeConfig) {
  if (!config.appBaseUrl || !config.webhookSecret) {
    throw new Error("Webhook runtime configuration is incomplete.");
  }

  return {
    callbackUrl: `${config.appBaseUrl.replace(/\/$/, "")}/api/webhooks/gitea`,
    secret: config.webhookSecret,
  };
}

export async function getGiteaRuntimeConfig(): Promise<GiteaRuntimeConfig> {
  return resolveGiteaRuntimeConfig({
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: env.NEXTAUTH_URL,
    AUTH_GITEA_ISSUER: env.AUTH_GITEA_ISSUER,
    GITEA_ADMIN_BASE_URL: env.GITEA_ADMIN_BASE_URL,
    GITEA_ORGANIZATION_NAME: env.GITEA_ORGANIZATION_NAME,
    AUTH_GITEA_ID: env.AUTH_GITEA_ID,
    AUTH_GITEA_SECRET: env.AUTH_GITEA_SECRET,
    GITEA_ADMIN_TOKEN: env.GITEA_ADMIN_TOKEN,
    GITEA_WEBHOOK_SECRET: env.GITEA_WEBHOOK_SECRET,
  });
}

export async function getGiteaRuntimeReadiness(): Promise<GiteaRuntimeReadiness> {
  return evaluateGiteaRuntimeReadiness(
    await getGiteaRuntimeConfig(),
    env.BOOTSTRAP_TOKEN,
  );
}

export async function getResolvedGiteaAuthConfig() {
  return resolveGiteaAuthConfig(await getGiteaRuntimeConfig());
}

export async function getResolvedGiteaAdminConfig() {
  return resolveGiteaAdminConfig(await getGiteaRuntimeConfig());
}

export async function getResolvedGiteaMigrationConfig() {
  return resolveGiteaMigrationConfig(await getGiteaRuntimeConfig());
}

export async function getResolvedGiteaWebhookConfig() {
  return resolveGiteaWebhookConfig(await getGiteaRuntimeConfig());
}

export async function hasResolvedWebhookConfiguration() {
  const readiness = await getGiteaRuntimeReadiness();
  return readiness.webhookReady;
}
