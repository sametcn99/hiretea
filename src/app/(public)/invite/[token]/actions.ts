"use server";

import { revalidatePath } from "next/cache";
import {
  markCandidateCaseCompleteFromInvite,
  unmarkCandidateCaseCompleteFromInvite,
} from "@/lib/candidate-cases/candidate-completion";
import { claimCandidateInvite } from "@/lib/candidate-invites/claim-candidate-invite";

export type ClaimCandidateInviteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  displayName?: string;
  email?: string;
  login?: string;
  temporaryPassword?: string;
  signInPath?: string;
};

export async function claimCandidateInviteAction(
  _previousState: ClaimCandidateInviteActionState,
  formData: FormData,
): Promise<ClaimCandidateInviteActionState> {
  const token = formData.get("token");

  if (typeof token !== "string" || token.trim().length === 0) {
    return {
      status: "error",
      message: "The onboarding invite token is missing.",
    };
  }

  try {
    const result = await claimCandidateInvite(token);

    return {
      status: "success",
      displayName: result.displayName,
      email: result.email,
      login: result.login,
      temporaryPassword: result.temporaryPassword,
      signInPath: result.signInPath,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "The onboarding invite could not be claimed.",
    };
  }
}

export type ToggleCandidateCaseCompletionActionState = {
  status: "idle" | "success" | "error";
  intent?: "mark" | "unmark";
  candidateCaseId?: string;
  message?: string;
};

export async function toggleCandidateCaseCompletionAction(
  _previousState: ToggleCandidateCaseCompletionActionState,
  formData: FormData,
): Promise<ToggleCandidateCaseCompletionActionState> {
  const token = formData.get("token");
  const candidateCaseId = formData.get("candidateCaseId");
  const intent = formData.get("intent");

  if (typeof token !== "string" || token.trim().length === 0) {
    return {
      status: "error",
      message: "The onboarding invite token is missing.",
    };
  }

  if (
    typeof candidateCaseId !== "string" ||
    candidateCaseId.trim().length === 0
  ) {
    return {
      status: "error",
      message: "The candidate case identifier is missing.",
    };
  }

  if (intent !== "mark" && intent !== "unmark") {
    return {
      status: "error",
      message: "Unknown completion action.",
    };
  }

  try {
    if (intent === "mark") {
      await markCandidateCaseCompleteFromInvite({
        token,
        candidateCaseId,
      });
    } else {
      await unmarkCandidateCaseCompleteFromInvite({
        token,
        candidateCaseId,
      });
    }

    revalidatePath("/invite/[token]", "page");

    return {
      status: "success",
      intent,
      candidateCaseId,
      message:
        intent === "mark"
          ? "Case marked as complete. Reviewers can now score it."
          : "Completion reverted. Keep editing the working repository.",
    };
  } catch (error) {
    return {
      status: "error",
      intent,
      candidateCaseId,
      message:
        error instanceof Error
          ? error.message
          : "The case completion could not be updated.",
    };
  }
}
