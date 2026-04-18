"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createCaseTemplate } from "@/lib/case-templates/create-case-template";
import {
  type CaseTemplateCreateInput,
  type CaseTemplateUpdateInput,
  caseTemplateCreateSchema,
  caseTemplateUpdateSchema,
} from "@/lib/case-templates/schemas";
import { updateCaseTemplate } from "@/lib/case-templates/update-case-template";

type CaseTemplateCreateField = keyof CaseTemplateCreateInput;
type CaseTemplateUpdateField = keyof CaseTemplateUpdateInput;

export type CreateCaseTemplateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<CaseTemplateCreateField, string[]>>;
};

export type UpdateCaseTemplateActionState = CreateCaseTemplateActionState;

function mapCreateFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<CaseTemplateCreateField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "name" ||
        field === "slug" ||
        field === "summary" ||
        field === "sourceRepositoryName" ||
        field === "createDedicatedRepository" ||
        field === "targetRepositoryName" ||
        field === "reviewerInstructions" ||
        field === "decisionGuidance" ||
        field === "reviewerIds" ||
        field === "rubricCriteria"
      ) {
        const existingErrors = fieldErrors[field] ?? [];
        fieldErrors[field] = [...existingErrors, issue.message];
      }

      return fieldErrors;
    },
    {},
  );
}

function mapUpdateFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<CaseTemplateUpdateField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "name" ||
        field === "slug" ||
        field === "summary" ||
        field === "reviewerInstructions" ||
        field === "decisionGuidance" ||
        field === "reviewerIds" ||
        field === "rubricCriteria"
      ) {
        const existingErrors = fieldErrors[field] ?? [];
        fieldErrors[field] = [...existingErrors, issue.message];
      }

      return fieldErrors;
    },
    {},
  );
}

export async function createCaseTemplateAction(
  _previousState: CreateCaseTemplateActionState,
  formData: FormData,
): Promise<CreateCaseTemplateActionState> {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);

  const parsedInput = caseTemplateCreateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    summary: formData.get("summary"),
    sourceRepositoryName: formData.get("sourceRepositoryName"),
    createDedicatedRepository: formData.get("createDedicatedRepository"),
    targetRepositoryName: formData.get("targetRepositoryName"),
    reviewerInstructions: formData.get("reviewerInstructions"),
    decisionGuidance: formData.get("decisionGuidance"),
    reviewerIds: formData.getAll("reviewerIds"),
    rubricCriteria: formData.get("rubricCriteria"),
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapCreateFieldErrors(parsedInput.error.issues),
    };
  }

  try {
    const template = await createCaseTemplate({
      actorId: session.user.id,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/case-templates");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: `${template.name} was created and its template-level review structure is ready for future assignments.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Case template creation failed. Review the configuration and try again.",
    };
  }
}

export async function updateCaseTemplateAction(
  templateId: string,
  _previousState: UpdateCaseTemplateActionState,
  formData: FormData,
): Promise<UpdateCaseTemplateActionState> {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);

  const parsedInput = caseTemplateUpdateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    summary: formData.get("summary"),
    reviewerInstructions: formData.get("reviewerInstructions"),
    decisionGuidance: formData.get("decisionGuidance"),
    reviewerIds: formData.getAll("reviewerIds"),
    rubricCriteria: formData.get("rubricCriteria"),
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapUpdateFieldErrors(parsedInput.error.issues),
    };
  }

  try {
    const template = await updateCaseTemplate({
      actorId: session.user.id,
      templateId,
      ...parsedInput.data,
    });

    revalidatePath("/dashboard/case-templates");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: `${template.name} was updated successfully.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Case template update failed. Review the configuration and try again.",
    };
  }
}
