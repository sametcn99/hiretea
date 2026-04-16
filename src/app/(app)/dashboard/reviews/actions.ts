"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { requireRole } from "@/lib/auth/session";
import { createEvaluationNote } from "@/lib/evaluation-notes/create-evaluation-note";
import {
  type EvaluationNoteCreateInput,
  evaluationNoteCreateSchema,
} from "@/lib/evaluation-notes/schemas";

type EvaluationField = keyof EvaluationNoteCreateInput;

export type CreateEvaluationNoteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  latestScore?: number;
  fieldErrors?: Partial<Record<EvaluationField, string[]>>;
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<EvaluationField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "candidateCaseId" ||
        field === "score" ||
        field === "summary" ||
        field === "note" ||
        field === "decision" ||
        field === "finalizeReview"
      ) {
        const existingErrors = fieldErrors[field] ?? [];
        fieldErrors[field] = [...existingErrors, issue.message];
      }

      return fieldErrors;
    },
    {},
  );
}

export async function createEvaluationNoteAction(
  _previousState: CreateEvaluationNoteActionState,
  formData: FormData,
): Promise<CreateEvaluationNoteActionState> {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  const parsedInput = evaluationNoteCreateSchema.safeParse({
    candidateCaseId: formData.get("candidateCaseId"),
    score: formData.get("score"),
    summary: formData.get("summary"),
    note: formData.get("note"),
    decision: formData.get("decision"),
    finalizeReview: formData.get("finalizeReview") === "on",
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapFieldErrors(parsedInput.error.issues),
    };
  }

  try {
    const result = await createEvaluationNote({
      ...actor,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/reviews");
    revalidatePath(`/dashboard/reviews/${parsedInput.data.candidateCaseId}`);
    revalidatePath("/dashboard/candidate-cases");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: parsedInput.data.finalizeReview
        ? `${result.candidateCase.caseTemplate.name} was reviewed and completed for ${result.candidateCase.candidate.name ?? result.candidateCase.candidate.email}.`
        : `A review note was added to ${result.candidateCase.caseTemplate.name} for ${result.candidateCase.candidate.name ?? result.candidateCase.candidate.email}.`,
      latestScore: result.note.score ?? undefined,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Reviewer note submission failed. Review the configuration and try again.",
    };
  }
}
