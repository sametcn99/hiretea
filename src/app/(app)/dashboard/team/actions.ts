"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { requireRole } from "@/lib/auth/session";
import { issueRecruiterInvite } from "@/lib/recruiter-invites/issue-recruiter-invite";
import { revokeActiveRecruiterInvite } from "@/lib/recruiter-invites/revoke-recruiter-invite";
import { deleteRecruiter } from "@/lib/recruiters/delete-recruiter";
import { provisionRecruiter } from "@/lib/recruiters/provision-recruiter";
import {
  type RecruiterProvisionInput,
  recruiterProvisionSchema,
} from "@/lib/recruiters/schemas";

type ProvisionRecruiterField = keyof RecruiterProvisionInput;

export type ProvisionRecruiterActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  inviteError?: string;
  fieldErrors?: Partial<Record<ProvisionRecruiterField, string[]>>;
};

function mapFieldErrors(issues: ZodIssue[]) {
  return issues.reduce<Partial<Record<ProvisionRecruiterField, string[]>>>(
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

export async function provisionRecruiterAction(
  _previousState: ProvisionRecruiterActionState,
  formData: FormData,
): Promise<ProvisionRecruiterActionState> {
  const session = await requireRole(UserRole.ADMIN);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  const parsedInput = recruiterProvisionSchema.safeParse({
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
    const result = await provisionRecruiter({
      ...actor,
      ...parsedInput.data,
    });

    let inviteError: string | undefined;

    try {
      await issueRecruiterInvite(result.recruiter.id, actor);
    } catch (error) {
      inviteError =
        error instanceof Error
          ? error.message
          : "The recruiting team member was provisioned, but the onboarding invite could not be generated.";
    }

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: `${result.recruiter.name ?? result.recruiter.email} was provisioned successfully.`,
      inviteError,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Recruiting team provisioning failed. Review the configuration and try again.",
    };
  }
}

export async function issueRecruiterInviteAction(recruiterId: string) {
  const session = await requireRole(UserRole.ADMIN);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    const invite = await issueRecruiterInvite(recruiterId, actor);

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success" as const,
      inviteUrl: invite.inviteUrl,
      expiresAt: invite.expiresAt.toISOString(),
      issueKind: invite.issueKind,
      resendSequence: invite.resendSequence,
    };
  } catch (error) {
    return {
      status: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Failed to generate a fresh onboarding invite.",
    };
  }
}

export async function revokeRecruiterInviteAction(recruiterId: string) {
  const session = await requireRole(UserRole.ADMIN);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    await revokeActiveRecruiterInvite(recruiterId, actor);

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/audit-trail");

    return { status: "success" as const };
  } catch (error) {
    return {
      status: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Failed to revoke the onboarding invite.",
    };
  }
}

export async function deleteRecruiterAction(recruiterId: string) {
  const session = await requireRole(UserRole.ADMIN);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    await deleteRecruiter(recruiterId, actor);

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/audit-trail");

    return { status: "success" as const };
  } catch (error) {
    return {
      status: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Failed to archive the recruiting team member.",
    };
  }
}
