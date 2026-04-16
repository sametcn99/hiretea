import { UserRole } from "@prisma/client";
import { getBootstrapStatus } from "../src/lib/bootstrap/status";
import { db } from "../src/lib/db";
import { createGiteaAdminClient } from "../src/lib/gitea/client";
import {
  getGiteaRuntimeConfig,
  getGiteaRuntimeReadiness,
} from "../src/lib/gitea/runtime-config";

type AuditDetail = {
  adminEmail?: string;
  companyName?: string;
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
  const expectedAdminEmail = requireEnv("hiretea_ADMIN_EMAIL");
  const expectedCompanyName = requireEnv("hiretea_COMPANY_NAME");
  const expectedDefaultBranch = requireEnv("hiretea_DEFAULT_BRANCH");
  const expectedOrganization = requireEnv("GITEA_ORGANIZATION_NAME");
  const expectedPublicBaseUrl =
    process.env.AUTH_GITEA_ISSUER?.trim() ||
    process.env.GITEA_PUBLIC_URL?.trim() ||
    null;
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
      select: {
        id: true,
        companyName: true,
        defaultBranch: true,
        giteaBaseUrl: true,
        giteaAdminBaseUrl: true,
        giteaOrganization: true,
        giteaAuthClientId: true,
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

  assert(bootstrapStatus.hasAdminUser, "Expected an admin user.");
  assert(
    bootstrapStatus.hasWorkspaceSettings,
    "Expected workspace settings.",
  );
  assert(
    !bootstrapStatus.requiresSetup,
    "Setup should be complete after bootstrap.",
  );
  assert(adminUsers.length === 1, "Expected a single admin user.");
  assert(adminUser?.email === expectedAdminEmail, "Admin email mismatch.");
  assert(adminUser?.isActive, "Admin should be active.");
  assert(
    workspaceSettings.length === 1,
    "Expected a single workspace settings row.",
  );
  assert(workspace, "Workspace settings are missing.");
  assert(
    workspace.companyName === expectedCompanyName,
    "Company name mismatch.",
  );
  assert(
    workspace.defaultBranch === expectedDefaultBranch,
    "Default branch mismatch.",
  );
  assert(
    workspace.giteaBaseUrl === expectedPublicBaseUrl,
    "Public Gitea URL mismatch.",
  );
  assert(
    workspace.giteaAdminBaseUrl === expectedAdminBaseUrl,
    "Admin Gitea URL mismatch.",
  );
  assert(
    workspace.giteaOrganization === expectedOrganization,
    "Organization mismatch.",
  );
  assert(
    workspace.giteaAuthClientId === expectedAuthClientId,
    "OAuth client ID mismatch.",
  );
  assert(
    runtimeReadiness.hasNextAuthSecret,
    "NextAuth secret is missing.",
  );
  assert(runtimeReadiness.hasAppUrl, "App URL is missing.");
  assert(runtimeReadiness.authReady, "Auth runtime should be ready.");
  assert(runtimeReadiness.adminReady, "Admin runtime should be ready.");
  assert(
    runtimeReadiness.migrationReady,
    "Migration runtime should be ready.",
  );
  assert(
    runtimeReadiness.webhookReady,
    "Webhook runtime should be ready.",
  );
  assert(
    runtimeConfig.publicBaseUrl === expectedPublicBaseUrl,
    "Runtime public base URL mismatch.",
  );
  assert(
    runtimeConfig.adminBaseUrl === expectedAdminBaseUrl,
    "Runtime admin base URL mismatch.",
  );
  assert(
    runtimeConfig.organization === expectedOrganization,
    "Runtime organization mismatch.",
  );
  assert(
    runtimeConfig.authClientId === expectedAuthClientId,
    "Runtime OAuth client ID mismatch.",
  );
  assert(
    runtimeConfig.authClientSecret === expectedAuthClientSecret,
    "Runtime OAuth client secret mismatch.",
  );
  assert(
    runtimeConfig.adminToken === expectedAdminToken,
    "Runtime admin token mismatch.",
  );
  assert(
    runtimeConfig.webhookSecret === expectedWebhookSecret,
    "Runtime webhook secret mismatch.",
  );

  const bootstrapAuditLog = auditLogs.find(
    (auditLog: { action: string; detail: unknown }) =>
      auditLog.action === "workspace.bootstrap.auto.completed",
  );

  assert(bootstrapAuditLog, "Missing bootstrap audit log.");

  const bootstrapAuditDetail = getAuditDetail(bootstrapAuditLog.detail);

  assert(
    bootstrapAuditDetail.adminEmail === expectedAdminEmail,
    "Audit admin email mismatch.",
  );
  assert(
    bootstrapAuditDetail.companyName === expectedCompanyName,
    "Audit company name mismatch.",
  );

  assert(expectedAdminBaseUrl, "Admin base URL is required.");
  assert(expectedAdminToken, "Admin token is required.");

  await assertGiteaConnectivity(
    expectedAdminBaseUrl,
    expectedAdminToken,
    expectedOrganization,
    expectedAuthClientId,
  );

  console.log("Smoke assertions passed.");
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
