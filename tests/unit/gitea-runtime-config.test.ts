import { describe, expect, it } from "vitest";
import {
  evaluateGiteaRuntimeReadiness,
  type GiteaRuntimeConfigSource,
  resolveGiteaAdminConfig,
  resolveGiteaAuthConfig,
  resolveGiteaMigrationConfig,
  resolveGiteaRuntimeConfig,
  resolveGiteaWebhookConfig,
} from "@/lib/gitea/runtime-config";

const FULL_SOURCE: GiteaRuntimeConfigSource = {
  NEXTAUTH_SECRET: "secret",
  NEXTAUTH_URL: "http://localhost:3000",
  AUTH_GITEA_ISSUER: "http://localhost:3001",
  GITEA_ADMIN_BASE_URL: "http://gitea:3000",
  GITEA_ORGANIZATION_NAME: "hiretea",
  AUTH_GITEA_ID: "oauth-client",
  AUTH_GITEA_SECRET: "oauth-secret",
  GITEA_ADMIN_TOKEN: "admin-token",
  GITEA_WEBHOOK_SECRET: "webhook-secret",
};

describe("resolveGiteaRuntimeConfig", () => {
  it("normalizes an env-like source into the runtime contract", () => {
    expect(resolveGiteaRuntimeConfig(FULL_SOURCE)).toEqual({
      nextAuthSecret: "secret",
      appBaseUrl: "http://localhost:3000",
      publicBaseUrl: "http://localhost:3001",
      adminBaseUrl: "http://gitea:3000",
      organization: "hiretea",
      authClientId: "oauth-client",
      authClientSecret: "oauth-secret",
      adminToken: "admin-token",
      webhookSecret: "webhook-secret",
    });
  });

  it("coerces every missing field to null", () => {
    expect(resolveGiteaRuntimeConfig({})).toEqual({
      nextAuthSecret: null,
      appBaseUrl: null,
      publicBaseUrl: null,
      adminBaseUrl: null,
      organization: null,
      authClientId: null,
      authClientSecret: null,
      adminToken: null,
      webhookSecret: null,
    });
  });

  it("treats explicit null/undefined as missing but preserves empty strings", () => {
    const config = resolveGiteaRuntimeConfig({
      NEXTAUTH_SECRET: null,
      NEXTAUTH_URL: undefined,
      AUTH_GITEA_ISSUER: "",
    });
    expect(config.nextAuthSecret).toBeNull();
    expect(config.appBaseUrl).toBeNull();
    expect(config.publicBaseUrl).toBe("");
  });
});

describe("evaluateGiteaRuntimeReadiness", () => {
  it("flags each readiness domain as ready when fully configured", () => {
    expect(
      evaluateGiteaRuntimeReadiness(
        resolveGiteaRuntimeConfig(FULL_SOURCE),
        "bootstrap-token",
      ),
    ).toEqual({
      hasBootstrapToken: true,
      hasNextAuthSecret: true,
      hasAppUrl: true,
      authReady: true,
      adminReady: true,
      migrationReady: true,
      webhookReady: true,
    });
  });

  it("reports everything as unready when config and bootstrap token are empty", () => {
    expect(
      evaluateGiteaRuntimeReadiness(resolveGiteaRuntimeConfig({}), null),
    ).toEqual({
      hasBootstrapToken: false,
      hasNextAuthSecret: false,
      hasAppUrl: false,
      authReady: false,
      adminReady: false,
      migrationReady: false,
      webhookReady: false,
    });
  });

  it("treats empty-string bootstrap token as missing", () => {
    expect(
      evaluateGiteaRuntimeReadiness(resolveGiteaRuntimeConfig(FULL_SOURCE), "")
        .hasBootstrapToken,
    ).toBe(false);
  });

  it("gates authReady on all four oauth fields", () => {
    const base = resolveGiteaRuntimeConfig(FULL_SOURCE);
    expect(
      evaluateGiteaRuntimeReadiness(
        { ...base, authClientSecret: null },
        "token",
      ).authReady,
    ).toBe(false);
    expect(
      evaluateGiteaRuntimeReadiness({ ...base, publicBaseUrl: null }, "token")
        .authReady,
    ).toBe(false);
  });

  it("gates adminReady and migrationReady on base URL, token, and organization", () => {
    const base = resolveGiteaRuntimeConfig(FULL_SOURCE);
    for (const override of [
      { adminToken: null },
      { organization: null },
      { adminBaseUrl: null },
    ] as const) {
      const readiness = evaluateGiteaRuntimeReadiness(
        { ...base, ...override },
        "token",
      );
      expect(readiness.adminReady).toBe(false);
      expect(readiness.migrationReady).toBe(false);
    }
  });

  it("gates webhookReady on app URL and webhook secret", () => {
    const base = resolveGiteaRuntimeConfig(FULL_SOURCE);
    expect(
      evaluateGiteaRuntimeReadiness({ ...base, webhookSecret: null }, "token")
        .webhookReady,
    ).toBe(false);
    expect(
      evaluateGiteaRuntimeReadiness({ ...base, appBaseUrl: null }, "token")
        .webhookReady,
    ).toBe(false);
  });
});

describe("resolveGiteaAuthConfig", () => {
  it("builds an auth config from the runtime contract", () => {
    expect(
      resolveGiteaAuthConfig(resolveGiteaRuntimeConfig(FULL_SOURCE)),
    ).toEqual({
      clientId: "oauth-client",
      clientSecret: "oauth-secret",
      issuer: "http://localhost:3001",
      internalBaseUrl: "http://gitea:3000",
      nextAuthSecret: "secret",
    });
  });

  it("falls back to the public issuer when no admin base URL is configured", () => {
    const config = resolveGiteaRuntimeConfig({
      ...FULL_SOURCE,
      GITEA_ADMIN_BASE_URL: null,
    });
    expect(resolveGiteaAuthConfig(config).internalBaseUrl).toBe(
      "http://localhost:3001",
    );
  });

  it("throws when any oauth field is missing", () => {
    expect(() =>
      resolveGiteaAuthConfig(
        resolveGiteaRuntimeConfig({ NEXTAUTH_SECRET: "secret" }),
      ),
    ).toThrow("Gitea OAuth configuration is incomplete.");
  });
});

describe("resolveGiteaAdminConfig", () => {
  it("returns the admin contract when fully configured", () => {
    expect(
      resolveGiteaAdminConfig(resolveGiteaRuntimeConfig(FULL_SOURCE)),
    ).toEqual({
      baseUrl: "http://gitea:3000",
      token: "admin-token",
      organization: "hiretea",
    });
  });

  it.each([
    ["GITEA_ADMIN_BASE_URL" as const],
    ["GITEA_ADMIN_TOKEN" as const],
    ["GITEA_ORGANIZATION_NAME" as const],
  ])("throws when %s is missing", (field) => {
    expect(() =>
      resolveGiteaAdminConfig(
        resolveGiteaRuntimeConfig({ ...FULL_SOURCE, [field]: null }),
      ),
    ).toThrow("Gitea admin configuration is incomplete.");
  });
});

describe("resolveGiteaMigrationConfig", () => {
  it("uses the admin base URL as the migration base URL", () => {
    expect(
      resolveGiteaMigrationConfig(resolveGiteaRuntimeConfig(FULL_SOURCE)),
    ).toEqual({
      baseUrl: "http://gitea:3000",
      token: "admin-token",
      organization: "hiretea",
    });
  });

  it.each([
    ["GITEA_ADMIN_BASE_URL" as const],
    ["GITEA_ADMIN_TOKEN" as const],
    ["GITEA_ORGANIZATION_NAME" as const],
  ])("throws when %s is missing", (field) => {
    expect(() =>
      resolveGiteaMigrationConfig(
        resolveGiteaRuntimeConfig({ ...FULL_SOURCE, [field]: null }),
      ),
    ).toThrow("Gitea repository migration configuration is incomplete.");
  });
});

describe("resolveGiteaWebhookConfig", () => {
  it("builds the webhook callback URL from the app base URL", () => {
    expect(
      resolveGiteaWebhookConfig(resolveGiteaRuntimeConfig(FULL_SOURCE)),
    ).toEqual({
      callbackUrl: "http://localhost:3000/api/webhooks/gitea",
      secret: "webhook-secret",
    });
  });

  it("strips a trailing slash from the app base URL", () => {
    const config = resolveGiteaRuntimeConfig({
      ...FULL_SOURCE,
      NEXTAUTH_URL: "http://localhost:3000/",
    });
    expect(resolveGiteaWebhookConfig(config).callbackUrl).toBe(
      "http://localhost:3000/api/webhooks/gitea",
    );
  });

  it("throws when app URL or webhook secret is missing", () => {
    expect(() =>
      resolveGiteaWebhookConfig(
        resolveGiteaRuntimeConfig({
          ...FULL_SOURCE,
          GITEA_WEBHOOK_SECRET: null,
        }),
      ),
    ).toThrow("Webhook runtime configuration is incomplete.");
    expect(() =>
      resolveGiteaWebhookConfig(
        resolveGiteaRuntimeConfig({ ...FULL_SOURCE, NEXTAUTH_URL: null }),
      ),
    ).toThrow("Webhook runtime configuration is incomplete.");
  });
});
