"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { requireRole } from "@/lib/auth/session";
import { createCandidateCase } from "@/lib/candidate-cases/create-candidate-case";
import { deleteCandidateCase } from "@/lib/candidate-cases/delete-candidate-case";
import { restoreCandidateCase } from "@/lib/candidate-cases/restore-candidate-case";
import { revokeCandidateCaseAccess } from "@/lib/candidate-cases/revoke-case-access";
import {
  type CandidateCaseCreateInput,
  type CandidateCaseUpdateInput,
  candidateCaseCreateSchema,
  candidateCaseUpdateSchema,
} from "@/lib/candidate-cases/schemas";
import { updateCandidateCase } from "@/lib/candidate-cases/update-candidate-case";

type CandidateCaseField = keyof CandidateCaseCreateInput;
type CandidateCaseUpdateField = keyof CandidateCaseUpdateInput;

export type CreateCandidateCaseActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  repositoryName?: string;
  repositoryUrl?: string | null;
  fieldErrors?: Partial<Record<CandidateCaseField, string[]>>;
};

export type UpdateCandidateCaseActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<CandidateCaseUpdateField, string[]>>;
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<CandidateCaseField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "candidateId" ||
        field === "caseTemplateId" ||
        field === "reviewerIds" ||
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
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  const parsedInput = candidateCaseCreateSchema.safeParse({
    candidateId: formData.get("candidateId"),
    caseTemplateId: formData.get("caseTemplateId"),
    reviewerIds: formData.getAll("reviewerIds"),
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
      ...actor,
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

export async function updateCandidateCaseAction(
  caseId: string,
  _previousState: UpdateCandidateCaseActionState,
  formData: FormData,
): Promise<UpdateCandidateCaseActionState> {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  const parsedInput = candidateCaseUpdateSchema.safeParse({
    candidateId: formData.get("candidateId"),
    caseTemplateId: formData.get("caseTemplateId"),
    reviewerIds: formData.getAll("reviewerIds"),
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
    const candidateCase = await updateCandidateCase({
      caseId,
      ...actor,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/reviews");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: `${candidateCase.caseTemplate.name} was updated successfully for ${candidateCase.candidate.name ?? candidateCase.candidate.email}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Candidate case update failed. Review the configuration and try again.",
    };
  }
}

export async function deleteCaseAction(caseId: string) {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    await deleteCandidateCase(caseId, actor);

    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/case-templates");
    revalidatePath("/dashboard/audit-trail");

    return { status: "success" };
  } catch (e: unknown) {
    return {
      status: "error",
      message:
        e instanceof Error ? e.message : "Failed to delete candidate case.",
    };
  }
}

export async function revokeAccessAction(caseId: string) {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    await revokeCandidateCaseAccess(caseId, actor);

    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/audit-trail");

    return { status: "success" };
  } catch (e: unknown) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to revoke access.",
    };
  }
}

export async function restoreCaseAction(caseId: string) {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    await restoreCandidateCase(caseId, actor);

    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/reviews");
    revalidatePath("/dashboard/audit-trail");

    return { status: "success" };
  } catch (e: unknown) {
    return {
      status: "error",
      message:
        e instanceof Error ? e.message : "Failed to restore candidate case.",
    };
  }
}
