import { createAuditLog } from "@/lib/audit/log";
import {
  type CandidateInviteLifecycleStatus,
  getCandidateInviteLifecycleStatus,
  hashCandidateInviteToken,
} from "@/lib/candidate-invites/shared";
import { db } from "@/lib/db";
import { getGiteaRuntimeConfig } from "@/lib/gitea/runtime-config";

type InviteLandingRecord = {
  id: string;
  expiresAt: Date;
  claimedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  resendSequence: number;
  issueKind: "INITIAL" | "RESEND";
  candidate: {
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

export type CandidateInviteLanding = {
  inviteId: string;
  displayName: string;
  email: string;
  login: string | null;
  status: CandidateInviteLifecycleStatus;
  expiresAt: Date;
  createdAt: Date;
  passwordAvailable: boolean;
};

async function getInviteLandingRecord(
  token: string,
): Promise<InviteLandingRecord | null> {
  return db.candidateInvite.findUnique({
    where: {
      tokenHash: hashCandidateInviteToken(token),
    },
    select: {
      id: true,
      expiresAt: true,
      claimedAt: true,
      revokedAt: true,
      createdAt: true,
      resendSequence: true,
      issueKind: true,
      candidate: {
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

export async function getCandidateInviteLanding(
  token: string,
): Promise<CandidateInviteLanding | null> {
  const invite = await getInviteLandingRecord(token);

  if (!invite) {
    return null;
  }

  return {
    inviteId: invite.id,
    displayName: invite.candidate.name ?? invite.candidate.email ?? "Candidate",
    email: invite.candidate.email ?? "No email available",
    login: invite.candidate.giteaIdentity?.login ?? null,
    status: getCandidateInviteLifecycleStatus({
      claimedAt: invite.claimedAt,
      revokedAt: invite.revokedAt,
      expiresAt: invite.expiresAt,
    }),
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    passwordAvailable: Boolean(invite.candidate.giteaIdentity?.initialPassword),
  };
}

export async function claimCandidateInvite(token: string) {
  const invite = await getInviteLandingRecord(token);

  if (!invite) {
    throw new Error("This onboarding invite is invalid.");
  }

  if (!invite.candidate.isActive) {
    throw new Error(
      "This candidate is inactive, so the onboarding invite can no longer be used.",
    );
  }

  const status = getCandidateInviteLifecycleStatus({
    claimedAt: invite.claimedAt,
    revokedAt: invite.revokedAt,
    expiresAt: invite.expiresAt,
  });

  if (status === "REVOKED") {
    throw new Error(
      "This onboarding invite was revoked. Ask the hiring team for a fresh invite.",
    );
  }

  if (status === "EXPIRED") {
    throw new Error(
      "This onboarding invite expired. Ask the hiring team to send a fresh invite.",
    );
  }

  if (status === "CLAIMED") {
    throw new Error(
      "This onboarding invite was already used. Continue in Gitea using your existing credentials.",
    );
  }

  const login = invite.candidate.giteaIdentity?.login;
  const temporaryPassword = invite.candidate.giteaIdentity?.initialPassword;

  if (!login || !temporaryPassword) {
    throw new Error(
      "The temporary access details are no longer available. Continue in Gitea using the password you already set.",
    );
  }

  const runtimeConfig = await getGiteaRuntimeConfig();
  const giteaLoginUrl = runtimeConfig.publicBaseUrl
    ? `${runtimeConfig.publicBaseUrl.replace(/\/$/, "")}/user/login`
    : "/sign-in";

  await db.candidateInvite.update({
    where: {
      id: invite.id,
    },
    data: {
      claimedAt: new Date(),
    },
  });

  await createAuditLog({
    action: "candidate.invite.claimed",
    resourceType: "CandidateInvite",
    resourceId: invite.id,
    detail: {
      candidateId: invite.candidate.id,
      candidateEmail: invite.candidate.email,
      candidateLogin: login,
      resendSequence: invite.resendSequence,
      issueKind: invite.issueKind,
    },
  });

  return {
    displayName: invite.candidate.name ?? invite.candidate.email ?? "Candidate",
    email: invite.candidate.email ?? "No email available",
    login,
    temporaryPassword,
    signInPath: giteaLoginUrl,
  };
}
