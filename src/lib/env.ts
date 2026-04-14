import { z } from "zod";

const deploymentGiteaModeSchema = z.enum(["bundled", "external"]);

export type DeploymentGiteaMode = z.infer<typeof deploymentGiteaModeSchema>;

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HIRETEA_GITEA_MODE: deploymentGiteaModeSchema.default("bundled"),
  HIRETEA_CONFIG_ENCRYPTION_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  hiretea_ADMIN_EMAIL: z.string().email().optional(),
  hiretea_ADMIN_NAME: z.string().min(1).optional(),
  hiretea_COMPANY_NAME: z.string().min(1).optional(),
  hiretea_DEFAULT_BRANCH: z.string().min(1).optional(),
  hiretea_MANUAL_INVITE_MODE: z.enum(["true", "false"]).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_GITEA_ID: z.string().min(1).optional(),
  AUTH_GITEA_SECRET: z.string().min(1).optional(),
  AUTH_GITEA_ISSUER: z.string().url().optional(),
  GITEA_ADMIN_BASE_URL: z.string().url().optional(),
  GITEA_ADMIN_TOKEN: z.string().min(1).optional(),
  GITEA_ORGANIZATION_NAME: z.string().min(1).optional(),
  GITEA_WEBHOOK_SECRET: z.string().min(1).optional(),
  BOOTSTRAP_TOKEN: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  HIRETEA_GITEA_MODE: process.env.HIRETEA_GITEA_MODE,
  HIRETEA_CONFIG_ENCRYPTION_KEY: process.env.HIRETEA_CONFIG_ENCRYPTION_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  hiretea_ADMIN_EMAIL: process.env.hiretea_ADMIN_EMAIL,
  hiretea_ADMIN_NAME: process.env.hiretea_ADMIN_NAME,
  hiretea_COMPANY_NAME: process.env.hiretea_COMPANY_NAME,
  hiretea_DEFAULT_BRANCH: process.env.hiretea_DEFAULT_BRANCH,
  hiretea_MANUAL_INVITE_MODE: process.env.hiretea_MANUAL_INVITE_MODE,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  AUTH_GITEA_ID: process.env.AUTH_GITEA_ID,
  AUTH_GITEA_SECRET: process.env.AUTH_GITEA_SECRET,
  AUTH_GITEA_ISSUER: process.env.AUTH_GITEA_ISSUER,
  GITEA_ADMIN_BASE_URL: process.env.GITEA_ADMIN_BASE_URL,
  GITEA_ADMIN_TOKEN: process.env.GITEA_ADMIN_TOKEN,
  GITEA_ORGANIZATION_NAME: process.env.GITEA_ORGANIZATION_NAME,
  GITEA_WEBHOOK_SECRET: process.env.GITEA_WEBHOOK_SECRET,
  BOOTSTRAP_TOKEN: process.env.BOOTSTRAP_TOKEN,
});

export function getDeploymentGiteaMode(): DeploymentGiteaMode {
  return env.HIRETEA_GITEA_MODE;
}

export function hasConfigEncryptionKey() {
  return Boolean(env.HIRETEA_CONFIG_ENCRYPTION_KEY);
}
