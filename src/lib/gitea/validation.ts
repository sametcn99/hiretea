import {
  env,
  hasAuthConfiguration,
  hasGiteaAdminConfiguration,
  hasWebhookConfiguration,
} from "@/lib/env";
import { GiteaAdminClientError, getGiteaAdminClient } from "@/lib/gitea/client";

type GiteaAdminUserResponse = {
  id: number;
  login: string;
};

type GiteaOrganizationResponse = {
  id: number;
  username: string;
  full_name?: string;
};

type GiteaWorkspaceValidationInput = {
  giteaBaseUrl: string;
  giteaOrganization: string;
};

export type GiteaWorkspaceValidationResult = {
  status: "ready" | "warning" | "error";
  message: string;
  adminLogin: string | null;
  organizationLabel: string | null;
  webhookReady: boolean;
};

function normalizeOrigin(value: string) {
  return new URL(value).origin;
}

export async function validateGiteaWorkspaceSettings(
  input: GiteaWorkspaceValidationInput,
) {
  if (!hasGiteaAdminConfiguration()) {
    throw new Error(
      "Gitea admin configuration is incomplete. Add the admin base URL, token, and organization before saving settings.",
    );
  }

  if (hasAuthConfiguration() && env.AUTH_GITEA_ISSUER) {
    const issuerOrigin = normalizeOrigin(env.AUTH_GITEA_ISSUER);
    const settingsOrigin = normalizeOrigin(input.giteaBaseUrl);

    if (issuerOrigin !== settingsOrigin) {
      throw new Error(
        "The workspace Gitea base URL must match the configured OAuth issuer origin.",
      );
    }
  }

  const client = getGiteaAdminClient();

  try {
    const [adminUser, organization] = await Promise.all([
      client.request<GiteaAdminUserResponse>("/user"),
      client.request<GiteaOrganizationResponse>(
        `/orgs/${input.giteaOrganization}`,
      ),
    ]);

    return {
      adminLogin: adminUser.login,
      organizationLabel: organization.full_name || organization.username,
      webhookReady: hasWebhookConfiguration(),
    };
  } catch (error) {
    if (error instanceof GiteaAdminClientError) {
      throw new Error(`Gitea validation failed: ${error.message}`);
    }

    throw error;
  }
}

export async function getGiteaWorkspaceValidationResult(
  input: GiteaWorkspaceValidationInput,
): Promise<GiteaWorkspaceValidationResult> {
  try {
    const result = await validateGiteaWorkspaceSettings(input);

    return {
      status: result.webhookReady ? "ready" : "warning",
      message: result.webhookReady
        ? `Validated with admin token as ${result.adminLogin}.`
        : `Validated with admin token as ${result.adminLogin}, but webhook runtime configuration is still missing.`,
      adminLogin: result.adminLogin,
      organizationLabel: result.organizationLabel,
      webhookReady: result.webhookReady,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Gitea validation could not be completed.",
      adminLogin: null,
      organizationLabel: null,
      webhookReady: false,
    };
  }
}
