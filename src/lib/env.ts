import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalStringEnv = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

const optionalUrlEnv = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional(),
);

const optionalEmailEnv = z.preprocess(
  emptyStringToUndefined,
  z.string().email().optional(),
);

const optionalBooleanStringEnv = z.preprocess(
  emptyStringToUndefined,
  z.enum(["true", "false"]).optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: optionalStringEnv,
  hiretea_ADMIN_EMAIL: optionalEmailEnv,
  hiretea_ADMIN_NAME: optionalStringEnv,
  hiretea_COMPANY_NAME: optionalStringEnv,
  hiretea_DEFAULT_BRANCH: optionalStringEnv,
  hiretea_MANUAL_INVITE_MODE: optionalBooleanStringEnv,
  NEXTAUTH_SECRET: optionalStringEnv,
  NEXTAUTH_URL: optionalUrlEnv,
  AUTH_GITEA_ID: optionalStringEnv,
  AUTH_GITEA_SECRET: optionalStringEnv,
  AUTH_GITEA_ISSUER: optionalUrlEnv,
  GITEA_ADMIN_BASE_URL: optionalUrlEnv,
  GITEA_ADMIN_TOKEN: optionalStringEnv,
  GITEA_ORGANIZATION_NAME: optionalStringEnv,
  GITEA_WEBHOOK_SECRET: optionalStringEnv,
  BOOTSTRAP_TOKEN: optionalStringEnv,
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
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
