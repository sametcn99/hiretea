"use server";

import { claimRecruiterInvite } from "@/lib/recruiter-invites/claim-recruiter-invite";

export type ClaimRecruiterInviteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  displayName?: string;
  email?: string;
  login?: string;
  temporaryPassword?: string;
  signInPath?: string;
};

export async function claimRecruiterInviteAction(
  _previousState: ClaimRecruiterInviteActionState,
  formData: FormData,
): Promise<ClaimRecruiterInviteActionState> {
  const token = formData.get("token");

  if (typeof token !== "string" || token.trim().length === 0) {
    return {
      status: "error",
      message: "The onboarding invite token is missing.",
    };
  }

  try {
    const result = await claimRecruiterInvite(token);

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
