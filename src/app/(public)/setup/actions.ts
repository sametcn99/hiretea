"use server";

import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { completeBootstrapSetup } from "@/lib/bootstrap/complete-bootstrap";
import {
  type BootstrapSetupInput,
  bootstrapSetupSchema,
} from "@/lib/bootstrap/schemas";
import { validateGiteaWorkspaceSettings } from "@/lib/gitea/validation";

type SetupField = keyof BootstrapSetupInput;

export type SetupActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<SetupField, string[]>>;
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<SetupField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "bootstrapToken" ||
        field === "adminName" ||
        field === "adminEmail" ||
        field === "companyName" ||
        field === "giteaBaseUrl" ||
        field === "giteaAdminBaseUrl" ||
        field === "giteaOrganization" ||
        field === "giteaAuthClientId" ||
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

export async function completeBootstrapSetupAction(
  _previousState: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  const parsedInput = bootstrapSetupSchema.safeParse({
    bootstrapToken: formData.get("bootstrapToken"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    companyName: formData.get("companyName"),
    giteaBaseUrl: formData.get("giteaBaseUrl"),
    giteaAdminBaseUrl: formData.get("giteaAdminBaseUrl"),
    giteaOrganization: formData.get("giteaOrganization"),
    giteaAuthClientId: formData.get("giteaAuthClientId"),
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
    await validateGiteaWorkspaceSettings(parsedInput.data);

    const result = await completeBootstrapSetup(parsedInput.data);

    revalidatePath("/");
    revalidatePath("/setup");
    revalidatePath("/sign-in");

    return {
      status: "success",
      message: `${result.companyName} is initialized. Continue to sign in as ${result.adminEmail}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Bootstrap setup failed. Review the configuration and try again.",
    };
  }
}
