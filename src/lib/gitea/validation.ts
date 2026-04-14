import { GiteaAdminClientError, createGiteaAdminClient } from "@/lib/gitea/client";
import { getGiteaRuntimeConfig } from "@/lib/gitea/runtime-config";

type GiteaAdminUserResponse = {
  id: number;
  login: string;
};

type GiteaOrganizationResponse = {
  id: number;
  username: string;
  full_name?: string;
};

type GiteaOAuthApplicationResponse = {
  client_id: string;
};

type GiteaWorkspaceValidationInput = {
  giteaBaseUrl: string;
  giteaAdminBaseUrl?: string | null;
  giteaOrganization: string;
  giteaAuthClientId?: string | null;
  giteaAdminToken?: string | null;
  giteaWebhookSecret?: string | null;
};

export type GiteaWorkspaceValidationResult = {
  status: "ready" | "warning" | "error";
  message: string;
  adminLogin: string | null;
  organizationLabel: string | null;
  webhookReady: boolean;
};

export async function validateGiteaWorkspaceSettings(
  input: GiteaWorkspaceValidationInput,
) {
  const runtimeConfig = await getGiteaRuntimeConfig();
  const adminBaseUrl =
    input.giteaAdminBaseUrl?.trim() ||
    runtimeConfig.adminBaseUrl ||
    input.giteaBaseUrl;
  const adminToken =
    input.giteaAdminToken?.trim() || runtimeConfig.adminToken || null;
  const authClientId =
    input.giteaAuthClientId?.trim() || runtimeConfig.authClientId || null;
  const webhookSecret =
    input.giteaWebhookSecret?.trim() || runtimeConfig.webhookSecret || null;

  if (!adminToken) {
    throw new Error(
      "Gitea admin configuration is incomplete. Add the admin base URL, token, and organization before saving settings.",
    );
  }

  const client = createGiteaAdminClient(adminBaseUrl, adminToken);

  try {
    const [adminUser, organization, oauthApplications] = await Promise.all([
      client.request<GiteaAdminUserResponse>("/user"),
      client.request<GiteaOrganizationResponse>(
        `/orgs/${input.giteaOrganization}`,
      ),
      authClientId
        ? client.request<GiteaOAuthApplicationResponse[]>(
            "/user/applications/oauth2",
          )
        : Promise.resolve(null),
    ]);

    if (
      authClientId &&
      !oauthApplications?.some(
        (application) => application.client_id === authClientId,
      )
    ) {
      throw new Error(
        "The configured OAuth client ID was not found for the current Gitea admin token.",
      );
    }

    return {
      adminLogin: adminUser.login,
      organizationLabel: organization.full_name || organization.username,
      webhookReady: Boolean(runtimeConfig.appBaseUrl && webhookSecret),
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
