import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXTAUTH_URL: "https://hiretea.example.com" },
}));

const {
  buildRecruiterInviteUrl,
  recruiterInviteTtlHours,
  generateRecruiterInviteToken,
  getRecruiterInviteExpiryDate,
  getRecruiterInviteLifecycleStatus,
  hashRecruiterInviteToken,
} = await import("@/lib/recruiter-invites/shared");

describe("hashRecruiterInviteToken", () => {
  it("is deterministic and returns a 64-char sha256 hex digest", () => {
    const hashA = hashRecruiterInviteToken("token-value");
    const hashB = hashRecruiterInviteToken("token-value");

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces a different digest for different inputs", () => {
    expect(hashRecruiterInviteToken("a")).not.toBe(
      hashRecruiterInviteToken("b"),
    );
  });
});

describe("generateRecruiterInviteToken", () => {
  it("produces unique base64url-safe tokens", () => {
    const a = generateRecruiterInviteToken();
    const b = generateRecruiterInviteToken();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("getRecruiterInviteExpiryDate", () => {
  it("adds the configured TTL hours to the provided instant", () => {
    const now = new Date("2025-01-01T00:00:00.000Z");
    const expiresAt = getRecruiterInviteExpiryDate(now);

    expect(expiresAt.getTime() - now.getTime()).toBe(
      recruiterInviteTtlHours * 60 * 60 * 1000,
    );
  });
});

describe("getRecruiterInviteLifecycleStatus", () => {
  const now = new Date("2025-06-15T12:00:00.000Z");
  const future = new Date("2025-06-16T12:00:00.000Z");
  const past = new Date("2025-06-14T12:00:00.000Z");

  it("returns REVOKED when revokedAt is set, regardless of other fields", () => {
    expect(
      getRecruiterInviteLifecycleStatus({
        claimedAt: now,
        revokedAt: now,
        expiresAt: future,
        now,
      }),
    ).toBe("REVOKED");
  });

  it("returns CLAIMED when claimedAt is set and revokedAt is null", () => {
    expect(
      getRecruiterInviteLifecycleStatus({
        claimedAt: now,
        revokedAt: null,
        expiresAt: future,
        now,
      }),
    ).toBe("CLAIMED");
  });

  it("returns EXPIRED when expiresAt is past and invite is neither claimed nor revoked", () => {
    expect(
      getRecruiterInviteLifecycleStatus({
        claimedAt: null,
        revokedAt: null,
        expiresAt: past,
        now,
      }),
    ).toBe("EXPIRED");
  });

  it("returns PENDING when the invite is still active", () => {
    expect(
      getRecruiterInviteLifecycleStatus({
        claimedAt: null,
        revokedAt: null,
        expiresAt: future,
        now,
      }),
    ).toBe("PENDING");
  });
});

describe("buildRecruiterInviteUrl", () => {
  it("constructs a recruiter invite URL from NEXTAUTH_URL and the token", () => {
    const url = buildRecruiterInviteUrl("abc123");

    expect(url).toBe("https://hiretea.example.com/team-invite/abc123");
  });
});
