import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXTAUTH_URL: "https://hiretea.example.com" },
}));

const {
  buildCandidateInviteUrl,
  candidateInviteTtlHours,
  generateCandidateInviteToken,
  getCandidateInviteExpiryDate,
  getCandidateInviteLifecycleStatus,
  hashCandidateInviteToken,
} = await import("@/lib/candidate-invites/shared");

describe("hashCandidateInviteToken", () => {
  it("is deterministic and returns a 64-char sha256 hex digest", () => {
    const hashA = hashCandidateInviteToken("token-value");
    const hashB = hashCandidateInviteToken("token-value");

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces a different digest for different inputs", () => {
    expect(hashCandidateInviteToken("a")).not.toBe(
      hashCandidateInviteToken("b"),
    );
  });
});

describe("generateCandidateInviteToken", () => {
  it("produces unique base64url-safe tokens", () => {
    const a = generateCandidateInviteToken();
    const b = generateCandidateInviteToken();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("getCandidateInviteExpiryDate", () => {
  it("adds the configured TTL hours to the provided instant", () => {
    const now = new Date("2025-01-01T00:00:00.000Z");
    const expiresAt = getCandidateInviteExpiryDate(now);

    expect(expiresAt.getTime() - now.getTime()).toBe(
      candidateInviteTtlHours * 60 * 60 * 1000,
    );
  });
});

describe("getCandidateInviteLifecycleStatus", () => {
  const now = new Date("2025-06-15T12:00:00.000Z");
  const future = new Date("2025-06-16T12:00:00.000Z");
  const past = new Date("2025-06-14T12:00:00.000Z");

  it("returns REVOKED when revokedAt is set, regardless of other fields", () => {
    expect(
      getCandidateInviteLifecycleStatus({
        claimedAt: now,
        revokedAt: now,
        expiresAt: future,
        now,
      }),
    ).toBe("REVOKED");
  });

  it("returns CLAIMED when claimedAt is set and revokedAt is null", () => {
    expect(
      getCandidateInviteLifecycleStatus({
        claimedAt: now,
        revokedAt: null,
        expiresAt: future,
        now,
      }),
    ).toBe("CLAIMED");
  });

  it("returns EXPIRED when expiresAt is past and invite is neither claimed nor revoked", () => {
    expect(
      getCandidateInviteLifecycleStatus({
        claimedAt: null,
        revokedAt: null,
        expiresAt: past,
        now,
      }),
    ).toBe("EXPIRED");
  });

  it("returns PENDING when the invite is still active", () => {
    expect(
      getCandidateInviteLifecycleStatus({
        claimedAt: null,
        revokedAt: null,
        expiresAt: future,
        now,
      }),
    ).toBe("PENDING");
  });
});

describe("buildCandidateInviteUrl", () => {
  it("constructs a candidate invite URL from NEXTAUTH_URL and the token", () => {
    const url = buildCandidateInviteUrl("abc123");

    expect(url).toBe("https://hiretea.example.com/invite/abc123");
  });
});
