import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

export const recruiterInviteTtlHours = 72;

export type RecruiterInviteLifecycleStatus =
  | "PENDING"
  | "CLAIMED"
  | "REVOKED"
  | "EXPIRED";

export function hashRecruiterInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRecruiterInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function getRecruiterInviteExpiryDate(now = new Date()) {
  return new Date(now.getTime() + recruiterInviteTtlHours * 60 * 60 * 1000);
}

export function getRecruiterInviteLifecycleStatus(input: {
  claimedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  now?: Date;
}): RecruiterInviteLifecycleStatus {
  const now = input.now ?? new Date();

  if (input.revokedAt) {
    return "REVOKED";
  }

  if (input.claimedAt) {
    return "CLAIMED";
  }

  if (input.expiresAt.getTime() <= now.getTime()) {
    return "EXPIRED";
  }

  return "PENDING";
}

export function buildRecruiterInviteUrl(token: string) {
  if (!env.NEXTAUTH_URL) {
    throw new Error(
      "NEXTAUTH_URL is required before recruiter invite links can be generated.",
    );
  }

  return new URL(`/team-invite/${token}`, env.NEXTAUTH_URL).toString();
}
