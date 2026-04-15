import { UserRole, WorkspaceGiteaMode } from "@prisma/client";
import { getBootstrapStatus } from "../src/lib/bootstrap/status";
import { db } from "../src/lib/db";
import { createGiteaAdminClient } from "../src/lib/gitea/client";
import {
  getGiteaRuntimeConfig,
  getGiteaRuntimeReadiness,
} from "../src/lib/gitea/runtime-config";

type Phase = "bundled-ready" | "external-pre-setup" | "external-post-setup";

type AuditDetail = {
  giteaMode?: string;
  adminEmail?: string;
  companyName?: string;
  hasExternalConnectionSecrets?: boolean;
};

type GiteaAdminUserResponse = {
  login: string;
};

type GiteaOrganizationResponse = {
  username: string;
};

type GiteaOAuthApplicationResponse = {
  client_id: string;
};

function getArg(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1 || index === process.argv.length - 1) {
    throw new Error(`Missing required argument: ${name}`);
  }

  return process.argv[index + 1];
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for smoke assertions.`);
  }

  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isPhase(value: string): value is Phase {
  return (
    value === "bundled-ready" ||
    value === "external-pre-setup" ||
    value === "external-post-setup"
  );
}

function getAuditDetail(value: unknown): AuditDetail {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as AuditDetail;
}

async function assertGiteaConnectivity(
  adminBaseUrl: string,
  adminToken: string,
  expectedOrganization: string,
  expectedAuthClientId: string | null,
) {
  const client = createGiteaAdminClient(adminBaseUrl, adminToken);

  const [adminUser, organization, oauthApplications] = await Promise.all([
    client.request<GiteaAdminUserResponse>("/user"),
    client.request<GiteaOrganizationResponse>(`/orgs/${expectedOrganization}`),
    expectedAuthClientId
      ? client.request<GiteaOAuthApplicationResponse[]>(
          "/user/applications/oauth2",
        )
      : Promise.resolve(null),
  ]);

  assert(adminUser.login.length > 0, "Expected Gitea admin user login.");
  assert(
    organization.username === expectedOrganization,
    `Expected Gitea organization ${expectedOrganization}, received ${organization.username}.`,
  );

  if (expectedAuthClientId) {
    assert(
      oauthApplications?.some(
        (application: GiteaOAuthApplicationResponse) =>
          application.client_id === expectedAuthClientId,
      ),
      `Expected OAuth client ${expectedAuthClientId} to exist in Gitea.`,
    );
  }
}

async function main() {
  const rawPhase = getArg("--phase");

  if (!isPhase(rawPhase)) {
    throw new Error(`Unsupported smoke assertion phase: ${rawPhase}`);
  }

  const expectedAdminEmail = requireEnv("hiretea_ADMIN_EMAIL");
  const expectedCompanyName = requireEnv("hiretea_COMPANY_NAME");
  const expectedDefaultBranch = requireEnv("hiretea_DEFAULT_BRANCH");
  const expectedOrganization = requireEnv("GITEA_ORGANIZATION_NAME");
  const expectedPublicBaseUrl =
    process.env.AUTH_GITEA_ISSUER?.trim() ||
    process.env.GITEA_PUBLIC_URL?.trim();
  const expectedAdminBaseUrl = process.env.GITEA_ADMIN_BASE_URL?.trim() || null;
  const expectedAuthClientId = process.env.AUTH_GITEA_ID?.trim() || null;
  const expectedAuthClientSecret =
    process.env.AUTH_GITEA_SECRET?.trim() || null;
  const expectedAdminToken = process.env.GITEA_ADMIN_TOKEN?.trim() || null;
  const expectedWebhookSecret =
    process.env.GITEA_WEBHOOK_SECRET?.trim() || null;

  const [
    bootstrapStatus,
    runtimeReadiness,
    runtimeConfig,
    adminUsers,
    workspaceSettings,
    auditLogs,
  ] = await Promise.all([
    getBootstrapStatus(),
    getGiteaRuntimeReadiness(),
    getGiteaRuntimeConfig(),
    db.user.findMany({
      where: {
        role: UserRole.ADMIN,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        email: true,
        isActive: true,
      },
    }),
    db.workspaceSettings.findMany({
      orderBy: {
        createdAt: "asc",
      },
      include: {
        giteaConfigSecret: true,
      },
    }),
    db.auditLog.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        action: true,
        detail: true,
      },
    }),
  ]);

  const adminUser = adminUsers[0] ?? null;
  const workspace = workspaceSettings[0] ?? null;

  switch (rawPhase) {
    case "bundled-ready": {
      assert(
        bootstrapStatus.hasAdminUser,
        "Bundled mode should create an admin.",
      );
      assert(
        bootstrapStatus.hasWorkspaceSettings,
        "Bundled mode should create workspace settings.",
      );
      assert(
        !bootstrapStatus.requiresSetup,
        "Bundled mode should not require setup after bootstrap.",
      );
      assert(adminUsers.length === 1, "Expected a single bundled admin user.");
      assert(
        adminUser?.email === expectedAdminEmail,
        "Bundled admin email mismatch.",
      );
      assert(adminUser?.isActive, "Bundled admin should be active.");
      assert(
        workspaceSettings.length === 1,
        "Expected a single bundled workspace settings row.",
      );
      assert(workspace, "Bundled workspace settings are missing.");
      assert(
        workspace.giteaMode === WorkspaceGiteaMode.BUNDLED,
        "Bundled workspace mode should be BUNDLED.",
      );
      assert(
        workspace.companyName === expectedCompanyName,
        "Bundled company name mismatch.",
      );
      assert(
        workspace.defaultBranch === expectedDefaultBranch,
        "Bundled default branch mismatch.",
      );
      assert(
        workspace.giteaBaseUrl === expectedPublicBaseUrl,
        "Bundled public Gitea URL mismatch.",
      );
      assert(
        workspace.giteaAdminBaseUrl === expectedAdminBaseUrl,
        "Bundled admin Gitea URL mismatch.",
      );
      assert(
        workspace.giteaOrganization === expectedOrganization,
        "Bundled organization mismatch.",
      );
      assert(
        workspace.giteaAuthClientId === expectedAuthClientId,
        "Bundled OAuth client ID mismatch.",
      );
      assert(
        workspace.giteaConfigSecret == null,
        "Bundled mode should not persist encrypted external secrets.",
      );
      assert(
        runtimeReadiness.mode === "bundled",
        "Expected bundled runtime mode.",
      );
      assert(
        runtimeReadiness.source === "env",
        "Bundled runtime should use env.",
      );
      assert(
        runtimeReadiness.hasNextAuthSecret,
        "Bundled NextAuth secret missing.",
      );
      assert(runtimeReadiness.hasAppUrl, "Bundled app URL missing.");
      assert(
        runtimeReadiness.authReady,
        "Bundled auth runtime should be ready.",
      );
      assert(
        runtimeReadiness.adminReady,
        "Bundled admin runtime should be ready.",
      );
      assert(
        runtimeReadiness.webhookReady,
        "Bundled webhook runtime should be ready.",
      );
      assert(runtimeConfig.mode === "bundled", "Bundled config mode mismatch.");
      assert(runtimeConfig.source === "env", "Bundled config source mismatch.");
      assert(
        runtimeConfig.publicBaseUrl === expectedPublicBaseUrl,
        "Bundled runtime public base URL mismatch.",
      );
      assert(
        runtimeConfig.adminBaseUrl === expectedAdminBaseUrl,
        "Bundled runtime admin base URL mismatch.",
      );
      assert(
        runtimeConfig.organization === expectedOrganization,
        "Bundled runtime organization mismatch.",
      );
      assert(
        runtimeConfig.authClientId === expectedAuthClientId,
        "Bundled runtime OAuth client ID mismatch.",
      );
      assert(
        runtimeConfig.authClientSecret === expectedAuthClientSecret,
        "Bundled runtime OAuth client secret mismatch.",
      );
      assert(
        runtimeConfig.adminToken === expectedAdminToken,
        "Bundled runtime admin token mismatch.",
      );
      assert(
        runtimeConfig.webhookSecret === expectedWebhookSecret,
        "Bundled runtime webhook secret mismatch.",
      );

      const bundledAuditLog = auditLogs.find(
        (auditLog: { action: string; detail: unknown }) =>
          auditLog.action === "workspace.bootstrap.auto.completed",
      );

      assert(bundledAuditLog, "Missing bundled bootstrap audit log.");

      const bundledAuditDetail = getAuditDetail(bundledAuditLog.detail);

      assert(
        bundledAuditDetail.giteaMode === "bundled",
        "Bundled audit log mode mismatch.",
      );
      assert(
        bundledAuditDetail.adminEmail === expectedAdminEmail,
        "Bundled audit admin email mismatch.",
      );
      assert(
        bundledAuditDetail.companyName === expectedCompanyName,
        "Bundled audit company name mismatch.",
      );
      assert(
        bundledAuditDetail.hasExternalConnectionSecrets === false,
        "Bundled audit log should not flag external secrets.",
      );

      assert(expectedAdminBaseUrl, "Bundled admin base URL is required.");
      assert(expectedAdminToken, "Bundled admin token is required.");

      await assertGiteaConnectivity(
        expectedAdminBaseUrl,
        expectedAdminToken,
        expectedOrganization,
        expectedAuthClientId,
      );

      break;
    }
    case "external-pre-setup": {
      assert(
        !bootstrapStatus.hasAdminUser,
        "External mode should not create an admin before setup.",
      );
      assert(
        !bootstrapStatus.hasWorkspaceSettings,
        "External mode should not create workspace settings before setup.",
      );
      assert(
        bootstrapStatus.requiresSetup,
        "External mode should require setup before bootstrap.",
      );
      assert(
        adminUsers.length === 0,
        "External mode should have no admin yet.",
      );
      assert(
        workspaceSettings.length === 0,
        "External mode should have no workspace settings yet.",
      );
      assert(
        runtimeReadiness.mode === "external",
        "Expected external runtime mode.",
      );
      assert(
        runtimeReadiness.source === "database",
        "External runtime should resolve from the database.",
      );
      assert(
        runtimeReadiness.hasConfigEncryptionKey,
        "External runtime should have an encryption key configured.",
      );
      assert(
        runtimeReadiness.hasNextAuthSecret,
        "External runtime should have a NextAuth secret configured.",
      );
      assert(
        runtimeReadiness.hasAppUrl,
        "External runtime should have an app URL.",
      );
      assert(
        !runtimeReadiness.workspaceConfigured,
        "External runtime should not be configured before setup.",
      );
      assert(
        !runtimeReadiness.authReady,
        "External auth should not be ready yet.",
      );
      assert(
        !runtimeReadiness.adminReady,
        "External admin should not be ready yet.",
      );
      assert(
        !runtimeReadiness.webhookReady,
        "External webhook runtime should not be ready yet.",
      );
      assert(
        runtimeConfig.publicBaseUrl == null,
        "External runtime should not expose a public URL before setup.",
      );
      assert(
        runtimeConfig.adminBaseUrl == null,
        "External runtime should not expose an admin URL before setup.",
      );
      assert(
        runtimeConfig.organization == null,
        "External runtime should not expose an organization before setup.",
      );
      break;
    }
    case "external-post-setup": {
      assert(
        bootstrapStatus.hasAdminUser,
        "External mode should create an admin after setup.",
      );
      assert(
        bootstrapStatus.hasWorkspaceSettings,
        "External mode should create workspace settings after setup.",
      );
      assert(
        !bootstrapStatus.requiresSetup,
        "External mode should not require setup after bootstrap.",
      );
      assert(adminUsers.length === 1, "Expected a single external admin user.");
      assert(
        adminUser?.email === expectedAdminEmail,
        "External admin email mismatch.",
      );
      assert(adminUser?.isActive, "External admin should be active.");
      assert(
        workspaceSettings.length === 1,
        "Expected a single external workspace settings row.",
      );
      assert(workspace, "External workspace settings are missing.");
      assert(
        workspace.giteaMode === WorkspaceGiteaMode.EXTERNAL,
        "External workspace mode should be EXTERNAL.",
      );
      assert(
        workspace.companyName === expectedCompanyName,
        "External company name mismatch.",
      );
      assert(
        workspace.defaultBranch === expectedDefaultBranch,
        "External default branch mismatch.",
      );
      assert(
        workspace.giteaBaseUrl === expectedPublicBaseUrl,
        "External public Gitea URL mismatch.",
      );
      assert(
        workspace.giteaAdminBaseUrl === expectedAdminBaseUrl,
        "External admin Gitea URL mismatch.",
      );
      assert(
        workspace.giteaOrganization === expectedOrganization,
        "External organization mismatch.",
      );
      assert(
        workspace.giteaAuthClientId === expectedAuthClientId,
        "External OAuth client ID mismatch.",
      );
      assert(
        workspace.giteaConfigSecret != null,
        "External setup should persist encrypted connection secrets.",
      );
      assert(
        workspace.giteaConfigSecret?.authClientSecretEncrypted != null,
        "Missing encrypted OAuth client secret.",
      );
      assert(
        workspace.giteaConfigSecret?.adminTokenEncrypted != null,
        "Missing encrypted admin token.",
      );
      assert(
        workspace.giteaConfigSecret?.webhookSecretEncrypted != null,
        "Missing encrypted webhook secret.",
      );
      assert(
        workspace.giteaConfigSecret?.authClientSecretEncrypted !==
          expectedAuthClientSecret,
        "OAuth client secret should be encrypted at rest.",
      );
      assert(
        workspace.giteaConfigSecret?.adminTokenEncrypted !== expectedAdminToken,
        "Admin token should be encrypted at rest.",
      );
      assert(
        workspace.giteaConfigSecret?.webhookSecretEncrypted !==
          expectedWebhookSecret,
        "Webhook secret should be encrypted at rest.",
      );
      assert(
        runtimeReadiness.mode === "external",
        "Expected external runtime mode.",
      );
      assert(
        runtimeReadiness.source === "database",
        "External runtime should use database-backed settings.",
      );
      assert(
        runtimeReadiness.workspaceConfigured,
        "External workspace should be configured after setup.",
      );
      assert(
        runtimeReadiness.authReady,
        "External auth runtime should be ready after setup.",
      );
      assert(
        runtimeReadiness.adminReady,
        "External admin runtime should be ready after setup.",
      );
      assert(
        runtimeReadiness.webhookReady,
        "External webhook runtime should be ready after setup.",
      );
      assert(
        runtimeConfig.mode === "external",
        "External config mode mismatch.",
      );
      assert(
        runtimeConfig.workspaceSettingsId === workspace.id,
        "External runtime should point at the stored workspace settings row.",
      );
      assert(
        runtimeConfig.publicBaseUrl === expectedPublicBaseUrl,
        "External runtime public base URL mismatch.",
      );
      assert(
        runtimeConfig.adminBaseUrl === expectedAdminBaseUrl,
        "External runtime admin base URL mismatch.",
      );
      assert(
        runtimeConfig.organization === expectedOrganization,
        "External runtime organization mismatch.",
      );
      assert(
        runtimeConfig.authClientId === expectedAuthClientId,
        "External runtime OAuth client ID mismatch.",
      );
      assert(
        runtimeConfig.authClientSecret === expectedAuthClientSecret,
        "External runtime OAuth client secret mismatch.",
      );
      assert(
        runtimeConfig.adminToken === expectedAdminToken,
        "External runtime admin token mismatch.",
      );
      assert(
        runtimeConfig.webhookSecret === expectedWebhookSecret,
        "External runtime webhook secret mismatch.",
      );

      const externalAuditLog = auditLogs.find(
        (auditLog: { action: string; detail: unknown }) =>
          auditLog.action === "workspace.bootstrap.completed",
      );

      assert(externalAuditLog, "Missing external bootstrap audit log.");

      const externalAuditDetail = getAuditDetail(externalAuditLog.detail);

      assert(
        externalAuditDetail.giteaMode === "external",
        "External audit log mode mismatch.",
      );
      assert(
        externalAuditDetail.adminEmail === expectedAdminEmail,
        "External audit admin email mismatch.",
      );
      assert(
        externalAuditDetail.companyName === expectedCompanyName,
        "External audit company name mismatch.",
      );
      assert(
        externalAuditDetail.hasExternalConnectionSecrets === true,
        "External audit log should flag encrypted connection secrets.",
      );

      assert(expectedAdminBaseUrl, "External admin base URL is required.");
      assert(expectedAdminToken, "External admin token is required.");

      await assertGiteaConnectivity(
        expectedAdminBaseUrl,
        expectedAdminToken,
        expectedOrganization,
        expectedAuthClientId,
      );

      break;
    }
  }

  console.log(`Smoke assertions passed for ${rawPhase}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
