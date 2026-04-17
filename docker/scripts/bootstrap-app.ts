import { ensureWorkspaceBootstrap } from "../../src/lib/bootstrap/complete-bootstrap";
import { db } from "../../src/lib/db";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for bootstrap.`);
  }

  return value;
}

function requireBooleanEnv(name: string) {
  const value = requireEnv(name);
  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

async function main() {
  const result = await ensureWorkspaceBootstrap({
    adminEmail: requireEnv("hiretea_ADMIN_EMAIL"),
    adminName: process.env.hiretea_ADMIN_NAME?.trim() || undefined,
    companyName: requireEnv("hiretea_COMPANY_NAME"),
    defaultBranch: requireEnv("hiretea_DEFAULT_BRANCH"),
    giteaBaseUrl:
      process.env.AUTH_GITEA_ISSUER?.trim() ||
      process.env.GITEA_PUBLIC_URL?.trim() ||
      requireEnv("GITEA_ADMIN_BASE_URL"),
    giteaAdminBaseUrl: process.env.GITEA_ADMIN_BASE_URL?.trim() || undefined,
    giteaOrganization: requireEnv("GITEA_ORGANIZATION_NAME"),
    giteaAuthClientId: process.env.AUTH_GITEA_ID?.trim() || undefined,
    manualInviteMode: requireBooleanEnv("hiretea_MANUAL_INVITE_MODE"),
  });

  console.log(
    `Workspace bootstrap is ready for ${result.companyName} (${result.adminEmail}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
