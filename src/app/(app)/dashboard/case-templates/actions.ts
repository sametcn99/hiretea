"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createCaseTemplate } from "@/lib/case-templates/create-case-template";
import {
  type CaseTemplateCreateInput,
  caseTemplateCreateSchema,
} from "@/lib/case-templates/schemas";

type CaseTemplateField = keyof CaseTemplateCreateInput;

type CreateCaseTemplateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<CaseTemplateField, string[]>>;
};

export const initialCreateCaseTemplateState: CreateCaseTemplateActionState = {
  status: "idle",
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<CaseTemplateField, string[]>>>(
    (fieldErrors, issue) => {
      const field = issue.path[0];

      if (
        field === "name" ||
        field === "slug" ||
        field === "summary" ||
        field === "repositoryName" ||
        field === "repositoryDescription" ||
        field === "defaultBranch"
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
    repositoryName: formData.get("repositoryName"),
    repositoryDescription: formData.get("repositoryDescription"),
    defaultBranch: formData.get("defaultBranch"),
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and submit again.",
      fieldErrors: mapFieldErrors(parsedInput.error.issues),
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
      message: `${template.name} was created and its Gitea repository is ready for future assignments.`,
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
