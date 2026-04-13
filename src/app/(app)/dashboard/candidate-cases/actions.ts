"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createCandidateCase } from "@/lib/candidate-cases/create-candidate-case";
import {
  type CandidateCaseCreateInput,
  candidateCaseCreateSchema,
} from "@/lib/candidate-cases/schemas";

type CandidateCaseField = keyof CandidateCaseCreateInput;

type CreateCandidateCaseActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  repositoryName?: string;
  repositoryUrl?: string | null;
  fieldErrors?: Partial<Record<CandidateCaseField, string[]>>;
};

export const initialCreateCandidateCaseState: CreateCandidateCaseActionState = {
  status: "idle",
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<CandidateCaseField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "candidateId" ||
        field === "caseTemplateId" ||
        field === "dueAt"
      ) {
        const existingErrors = fieldErrors[field] ?? [];
        fieldErrors[field] = [...existingErrors, issue.message];
      }

      return fieldErrors;
    },
    {},
  );
}

export async function createCandidateCaseAction(
  _previousState: CreateCandidateCaseActionState,
  formData: FormData,
): Promise<CreateCandidateCaseActionState> {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);

  const parsedInput = candidateCaseCreateSchema.safeParse({
    candidateId: formData.get("candidateId"),
    caseTemplateId: formData.get("caseTemplateId"),
    dueAt: formData.get("dueAt"),
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapFieldErrors(parsedInput.error.issues),
    };
  }

  try {
    const candidateCase = await createCandidateCase({
      actorId: session.user.id,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/case-templates");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: `${candidateCase.caseTemplate.name} was assigned successfully to ${candidateCase.candidate.name ?? candidateCase.candidate.email}.`,
      repositoryName: candidateCase.workingRepository ?? undefined,
      repositoryUrl: candidateCase.workingRepositoryUrl,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Candidate case provisioning failed. Review the configuration and try again.",
    };
  }
}
