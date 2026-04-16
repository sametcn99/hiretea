import { createAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import {
  getRecruiterInviteLifecycleStatus,
  hashRecruiterInviteToken,
  type RecruiterInviteLifecycleStatus,
} from "@/lib/recruiter-invites/shared";

type InviteLandingRecord = {
  id: string;
  expiresAt: Date;
  claimedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  resendSequence: number;
  issueKind: "INITIAL" | "RESEND";
  recruiter: {
    id: string;
    name: string | null;
    email: string | null;
    isActive: boolean;
    giteaIdentity: {
      login: string;
      initialPassword: string | null;
    } | null;
  };
};

export type RecruiterInviteLanding = {
  inviteId: string;
  displayName: string;
  email: string;
  login: string | null;
  status: RecruiterInviteLifecycleStatus;
  expiresAt: Date;
  createdAt: Date;
  passwordAvailable: boolean;
};

async function getInviteLandingRecord(
  token: string,
): Promise<InviteLandingRecord | null> {
  return db.recruiterInvite.findUnique({
    where: {
      tokenHash: hashRecruiterInviteToken(token),
    },
    select: {
      id: true,
      expiresAt: true,
      claimedAt: true,
      revokedAt: true,
      createdAt: true,
      resendSequence: true,
      issueKind: true,
      recruiter: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          giteaIdentity: {
            select: {
              login: true,
              initialPassword: true,
            },
          },
        },
      },
    },
  });
}

export async function getRecruiterInviteLanding(
  token: string,
): Promise<RecruiterInviteLanding | null> {
  const invite = await getInviteLandingRecord(token);

  if (!invite) {
    return null;
  }

  return {
    inviteId: invite.id,
    displayName:
      invite.recruiter.name ?? invite.recruiter.email ?? "Team member",
    email: invite.recruiter.email ?? "No email available",
    login: invite.recruiter.giteaIdentity?.login ?? null,
    status: getRecruiterInviteLifecycleStatus({
      claimedAt: invite.claimedAt,
      revokedAt: invite.revokedAt,
      expiresAt: invite.expiresAt,
    }),
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    passwordAvailable: Boolean(invite.recruiter.giteaIdentity?.initialPassword),
  };
}

export async function claimRecruiterInvite(token: string) {
  const invite = await getInviteLandingRecord(token);

  if (!invite) {
    throw new Error("This onboarding invite is invalid.");
  }

  if (!invite.recruiter.isActive) {
    throw new Error(
      "This recruiting team member is inactive, so the onboarding invite can no longer be used.",
    );
  }

  const status = getRecruiterInviteLifecycleStatus({
    claimedAt: invite.claimedAt,
    revokedAt: invite.revokedAt,
    expiresAt: invite.expiresAt,
  });

  if (status === "REVOKED") {
    throw new Error(
      "This onboarding invite was revoked. Ask the workspace admin for a fresh invite.",
    );
  }

  if (status === "EXPIRED") {
    throw new Error(
      "This onboarding invite expired. Ask the workspace admin to send a fresh invite.",
    );
  }

  if (status === "CLAIMED") {
    throw new Error(
      "This onboarding invite was already used. Continue with the sign-in flow using your Gitea credentials.",
    );
  }

  const login = invite.recruiter.giteaIdentity?.login;
  const temporaryPassword = invite.recruiter.giteaIdentity?.initialPassword;

  if (!login || !temporaryPassword) {
    throw new Error(
      "The temporary access details are no longer available. Continue with the sign-in flow using the password you already set in Gitea.",
    );
  }

  await db.recruiterInvite.update({
    where: { id: invite.id },
    data: { claimedAt: new Date() },
  });

  await createAuditLog({
    action: "recruiter.invite.claimed",
    resourceType: "RecruiterInvite",
    resourceId: invite.id,
    detail: {
      recruiterId: invite.recruiter.id,
      recruiterEmail: invite.recruiter.email,
      recruiterLogin: login,
      resendSequence: invite.resendSequence,
      issueKind: invite.issueKind,
    },
  });

  return {
    displayName:
      invite.recruiter.name ?? invite.recruiter.email ?? "Team member",
    email: invite.recruiter.email ?? "No email available",
    login,
    temporaryPassword,
    signInPath: "/sign-in",
  };
}
