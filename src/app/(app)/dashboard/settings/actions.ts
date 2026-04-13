"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { requireRole } from "@/lib/auth/session";
import {
  type WorkspaceSettingsUpdateInput,
  workspaceSettingsUpdateSchema,
} from "@/lib/workspace-settings/schemas";
import { updateWorkspaceSettings } from "@/lib/workspace-settings/update-workspace-settings";

type WorkspaceSettingsField = keyof WorkspaceSettingsUpdateInput;

type UpdateWorkspaceSettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<WorkspaceSettingsField, string[]>>;
};

export const initialUpdateWorkspaceSettingsState: UpdateWorkspaceSettingsActionState =
  {
    status: "idle",
  };

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<WorkspaceSettingsField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "companyName" ||
        field === "giteaBaseUrl" ||
        field === "giteaOrganization" ||
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

  const parsedInput = workspaceSettingsUpdateSchema.safeParse({
    companyName: formData.get("companyName"),
    giteaBaseUrl: formData.get("giteaBaseUrl"),
    giteaOrganization: formData.get("giteaOrganization"),
    defaultBranch: formData.get("defaultBranch"),
    manualInviteMode: formData.get("manualInviteMode") === "on",
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapFieldErrors(parsedInput.error.issues),
    };
  }

  try {
    const nextSettings = await updateWorkspaceSettings({
      actorId: session.user.id,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/case-templates");
    revalidatePath("/dashboard/audit-trail");

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
