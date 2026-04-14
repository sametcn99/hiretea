"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { requireRole } from "@/lib/auth/session";
import { provisionCandidate } from "@/lib/candidates/provision-candidate";
import {
  type CandidateProvisionInput,
  candidateProvisionSchema,
} from "@/lib/candidates/schemas";

type ProvisionCandidateField = keyof CandidateProvisionInput;

export type ProvisionCandidateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  temporaryPassword?: string;
  fieldErrors?: Partial<Record<ProvisionCandidateField, string[]>>;
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<ProvisionCandidateField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "displayName" ||
        field === "email" ||
        field === "username"
      ) {
        const existingErrors = fieldErrors[field] ?? [];
        fieldErrors[field] = [...existingErrors, issue.message];
      }

      return fieldErrors;
    },
    {},
  );
}

export async function provisionCandidateAction(
  _previousState: ProvisionCandidateActionState,
  formData: FormData,
): Promise<ProvisionCandidateActionState> {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);

  const parsedInput = candidateProvisionSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    username: formData.get("username"),
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapFieldErrors(parsedInput.error.issues),
    };
  }

  try {
    const result = await provisionCandidate({
      actorId: session.user.id,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: `${result.candidate.name ?? result.candidate.email} was provisioned successfully.`,
      temporaryPassword: result.temporaryPassword,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Candidate provisioning failed. Review the configuration and try again.",
    };
  }
}
