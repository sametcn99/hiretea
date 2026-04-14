import { completeBootstrapSetup } from "../../src/lib/bootstrap/complete-bootstrap";
import { db } from "../../src/lib/db";
import { validateGiteaWorkspaceSettings } from "../../src/lib/gitea/validation";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for external smoke bootstrap.`);
  }

  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const expectInvalidToken = process.argv.includes("--expect-invalid-token");

  const input = {
    bootstrapToken: expectInvalidToken
      ? "invalid-smoke-token"
      : requireEnv("BOOTSTRAP_TOKEN"),
    giteaMode: "external" as const,
    adminEmail: requireEnv("hiretea_ADMIN_EMAIL"),
    adminName: requireEnv("hiretea_ADMIN_NAME"),
    companyName: requireEnv("hiretea_COMPANY_NAME"),
    giteaBaseUrl: requireEnv("AUTH_GITEA_ISSUER"),
    giteaAdminBaseUrl: requireEnv("GITEA_ADMIN_BASE_URL"),
    giteaOrganization: requireEnv("GITEA_ORGANIZATION_NAME"),
    giteaAuthClientId: requireEnv("AUTH_GITEA_ID"),
    giteaAuthClientSecret: requireEnv("AUTH_GITEA_SECRET"),
    giteaAdminToken: requireEnv("GITEA_ADMIN_TOKEN"),
    giteaWebhookSecret: requireEnv("GITEA_WEBHOOK_SECRET"),
    defaultBranch: requireEnv("hiretea_DEFAULT_BRANCH"),
    manualInviteMode: true,
  };

  if (expectInvalidToken) {
    try {
      await completeBootstrapSetup(input);
    } catch (error) {
      assert(
        error instanceof Error &&
          error.message === "The bootstrap token is invalid.",
        "Expected an invalid bootstrap token rejection.",
      );
      console.log("Observed the expected invalid bootstrap token rejection.");
      return;
    }

    throw new Error("Expected invalid bootstrap token flow to fail.");
  }

  const validationResult = await validateGiteaWorkspaceSettings({
    giteaBaseUrl: input.giteaBaseUrl,
    giteaAdminBaseUrl: input.giteaAdminBaseUrl,
    giteaOrganization: input.giteaOrganization,
    giteaAuthClientId: input.giteaAuthClientId,
    giteaAdminToken: input.giteaAdminToken,
    giteaWebhookSecret: input.giteaWebhookSecret,
  });

  const result = await completeBootstrapSetup(input);

  console.log(
    `Validated external workspace against ${validationResult.organizationLabel ?? input.giteaOrganization}.`,
  );
  console.log(
    `Completed external bootstrap for ${result.companyName} (${result.adminEmail}).`,
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
