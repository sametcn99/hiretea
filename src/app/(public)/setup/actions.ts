"use server";

import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { completeBootstrapSetup } from "@/lib/bootstrap/complete-bootstrap";
import {
  type BootstrapSetupInput,
  bootstrapSetupSchema,
} from "@/lib/bootstrap/schemas";

type SetupField = keyof BootstrapSetupInput;

type SetupActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<SetupField, string[]>>;
};

export const initialSetupActionState: SetupActionState = {
  status: "idle",
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
