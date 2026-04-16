"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { requireRole } from "@/lib/auth/session";
import { issueCandidateInvite } from "@/lib/candidate-invites/issue-candidate-invite";
import { revokeActiveCandidateInvite } from "@/lib/candidate-invites/revoke-candidate-invite";
import { deleteCandidate } from "@/lib/candidates/delete-candidate";
import { provisionCandidate } from "@/lib/candidates/provision-candidate";
import {
  type CandidateProvisionInput,
  candidateProvisionSchema,
} from "@/lib/candidates/schemas";

type ProvisionCandidateField = keyof CandidateProvisionInput;

export type ProvisionCandidateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  inviteError?: string;
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
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

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
      ...actor,
      ...parsedInput.data,
    });

    let inviteError: string | undefined;

    try {
      await issueCandidateInvite(result.candidate.id, actor);
    } catch (error) {
      inviteError =
        error instanceof Error
          ? error.message
          : "The candidate was provisioned, but the onboarding invite could not be generated.";
    }

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/audit-trail");

    return {
      status: "success",
      message: `${result.candidate.name ?? result.candidate.email} was provisioned successfully.`,
      inviteError,
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

export async function issueCandidateInviteAction(candidateId: string) {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    const invite = await issueCandidateInvite(candidateId, actor);

    revalidatePath("/dashboard/candidates");
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

export async function revokeCandidateInviteAction(candidateId: string) {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    await revokeActiveCandidateInvite(candidateId, actor);

    revalidatePath("/dashboard/candidates");
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

export async function deleteCandidateAction(candidateId: string) {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const actor: AuthorizedActor = {
    actorId: session.user.id,
    actorRole: session.user.role,
  };

  try {
    await deleteCandidate(candidateId, actor);

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/audit-trail");

    return { status: "success" };
  } catch (e: unknown) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to delete candidate.",
    };
  }
}
