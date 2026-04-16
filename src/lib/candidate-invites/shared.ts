import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

export const candidateInviteTtlHours = 72;

export type CandidateInviteLifecycleStatus =
  | "PENDING"
  | "CLAIMED"
  | "REVOKED"
  | "EXPIRED";

export function hashCandidateInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateCandidateInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function getCandidateInviteExpiryDate(now = new Date()) {
  return new Date(now.getTime() + candidateInviteTtlHours * 60 * 60 * 1000);
}

export function getCandidateInviteLifecycleStatus(input: {
  claimedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  now?: Date;
}): CandidateInviteLifecycleStatus {
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

export function buildCandidateInviteUrl(token: string) {
  if (!env.NEXTAUTH_URL) {
    throw new Error(
      "NEXTAUTH_URL is required before candidate invite links can be generated.",
    );
  }

  return new URL(`/invite/${token}`, env.NEXTAUTH_URL).toString();
}
