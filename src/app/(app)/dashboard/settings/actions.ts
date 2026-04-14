"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { requireRole } from "@/lib/auth/session";
import { validateGiteaWorkspaceSettings } from "@/lib/gitea/validation";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";
import {
  type WorkspaceSettingsUpdateInput,
  workspaceSettingsUpdateSchema,
} from "@/lib/workspace-settings/schemas";
import { updateWorkspaceSettings } from "@/lib/workspace-settings/update-workspace-settings";

type WorkspaceSettingsField = keyof WorkspaceSettingsUpdateInput;

export type UpdateWorkspaceSettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<WorkspaceSettingsField, string[]>>;
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<WorkspaceSettingsField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "companyName" ||
        field === "giteaMode" ||
        field === "giteaBaseUrl" ||
        field === "giteaAdminBaseUrl" ||
        field === "giteaOrganization" ||
        field === "giteaAuthClientId" ||
        field === "giteaAuthClientSecret" ||
        field === "giteaAdminToken" ||
        field === "giteaWebhookSecret" ||
        field === "defaultBranch" ||
        field === "manualInviteMode"
      ) {
        const existingErrors = fieldErrors[field] ?? [];
        fieldErrors[field] = [...existingErrors, issue.message];
      }

      return fieldErrors;
    },
    {},
  );
}

export async function updateWorkspaceSettingsAction(
  _previousState: UpdateWorkspaceSettingsActionState,
  formData: FormData,
): Promise<UpdateWorkspaceSettingsActionState> {
  const session = await requireRole(UserRole.ADMIN);
  const currentSettings = await getWorkspaceSettingsOrThrow();

  const parsedInput = workspaceSettingsUpdateSchema.safeParse({
    companyName: formData.get("companyName"),
    giteaMode: formData.get("giteaMode"),
    giteaBaseUrl: formData.get("giteaBaseUrl"),
    giteaAdminBaseUrl: formData.get("giteaAdminBaseUrl"),
    giteaOrganization: formData.get("giteaOrganization"),
    giteaAuthClientId: formData.get("giteaAuthClientId"),
    giteaAuthClientSecret: formData.get("giteaAuthClientSecret"),
    giteaAdminToken: formData.get("giteaAdminToken"),
    giteaWebhookSecret: formData.get("giteaWebhookSecret"),
    defaultBranch: formData.get("defaultBranch"),
    manualInviteMode: true,
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapFieldErrors(parsedInput.error.issues),
    };
  }

  try {
    if (parsedInput.data.giteaMode !== currentSettings.giteaMode) {
      throw new Error(
        "Switching between bundled and external Gitea modes is not supported after bootstrap.",
      );
    }

    if (
      parsedInput.data.giteaMode === "external" &&
      currentSettings.giteaAuthClientId &&
      parsedInput.data.giteaAuthClientId !== currentSettings.giteaAuthClientId &&
      !parsedInput.data.giteaAuthClientSecret
    ) {
      throw new Error(
        "Enter the replacement OAuth client secret when changing the external OAuth client ID.",
      );
    }

    await validateGiteaWorkspaceSettings(parsedInput.data);

    const nextSettings = await updateWorkspaceSettings({
      actorId: session.user.id,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/case-templates");
    revalidatePath("/dashboard/audit-trail");
    revalidatePath("/sign-in");

    return {
      status: "success",
      message: `${nextSettings.companyName} settings were updated successfully.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Workspace settings could not be updated. Review the configuration and try again.",
    };
  }
}
