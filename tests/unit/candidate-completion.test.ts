import { describe, expect, it } from "vitest";
import {
  computeCandidateCompletionSignal,
  extractGiteaLoginTimestamp,
  isCandidateCompletionActive,
} from "@/lib/candidate-cases/candidate-completion";

describe("computeCandidateCompletionSignal", () => {
  it("returns LOGIN_REQUIRED when the candidate has not signed in and completion is untouched", () => {
    const signal = computeCandidateCompletionSignal({
      candidateCompletionRequestedAt: null,
      candidateCompletionLockedAt: null,
      candidateCompletionSource: null,
      hasObservedLogin: false,
      firstReviewNoteAt: null,
    });

    expect(signal).toEqual({ kind: "LOGIN_REQUIRED" });
  });

  it("returns OPEN once the candidate has logged in and completion is untouched", () => {
    const signal = computeCandidateCompletionSignal({
      candidateCompletionRequestedAt: null,
      candidateCompletionLockedAt: null,
      candidateCompletionSource: null,
      hasObservedLogin: true,
      firstReviewNoteAt: null,
    });

    expect(signal).toEqual({ kind: "OPEN" });
  });

  it("returns MARKED_REVERTIBLE when requestedAt is set without a review note or lock", () => {
    const requestedAt = new Date("2026-04-18T10:00:00Z");

    const signal = computeCandidateCompletionSignal({
      candidateCompletionRequestedAt: requestedAt,
      candidateCompletionLockedAt: null,
      candidateCompletionSource: "MANUAL",
      hasObservedLogin: true,
      firstReviewNoteAt: null,
    });

    expect(signal).toEqual({
      kind: "MARKED_REVERTIBLE",
      requestedAt,
      source: "MANUAL",
    });
  });

  it("returns LOCKED_BY_REVIEW when a review note already exists", () => {
    const requestedAt = new Date("2026-04-18T10:00:00Z");
    const firstReviewNoteAt = new Date("2026-04-18T11:00:00Z");

    const signal = computeCandidateCompletionSignal({
      candidateCompletionRequestedAt: requestedAt,
      candidateCompletionLockedAt: null,
      candidateCompletionSource: "MANUAL",
      hasObservedLogin: true,
      firstReviewNoteAt,
    });

    expect(signal).toEqual({
      kind: "LOCKED_BY_REVIEW",
      requestedAt,
      source: "MANUAL",
      firstReviewNoteAt,
    });
  });

  it("returns LOCKED_BY_DEADLINE when lockedAt is set regardless of review notes", () => {
    const lockedAt = new Date("2026-04-18T12:00:00Z");

    const signal = computeCandidateCompletionSignal({
      candidateCompletionRequestedAt: lockedAt,
      candidateCompletionLockedAt: lockedAt,
      candidateCompletionSource: "AUTO_DEADLINE",
      hasObservedLogin: true,
      firstReviewNoteAt: null,
    });

    expect(signal).toEqual({
      kind: "LOCKED_BY_DEADLINE",
      requestedAt: lockedAt,
      lockedAt,
      source: "AUTO_DEADLINE",
    });
  });
});

describe("isCandidateCompletionActive", () => {
  it("reports inactive when both timestamps are null", () => {
    expect(
      isCandidateCompletionActive({
        candidateCompletionRequestedAt: null,
        candidateCompletionLockedAt: null,
        candidateCompletionSource: null,
      }),
    ).toBe(false);
  });

  it("reports active once requestedAt is populated", () => {
    expect(
      isCandidateCompletionActive({
        candidateCompletionRequestedAt: new Date(),
        candidateCompletionLockedAt: null,
        candidateCompletionSource: "MANUAL",
      }),
    ).toBe(true);
  });

  it("reports active once lockedAt is populated", () => {
    expect(
      isCandidateCompletionActive({
        candidateCompletionRequestedAt: null,
        candidateCompletionLockedAt: new Date(),
        candidateCompletionSource: "AUTO_DEADLINE",
      }),
    ).toBe(true);
  });
});

describe("extractGiteaLoginTimestamp", () => {
  it("returns null for a missing last_login value", () => {
    expect(extractGiteaLoginTimestamp(null)).toBeNull();
    expect(extractGiteaLoginTimestamp(undefined)).toBeNull();
    expect(extractGiteaLoginTimestamp({ last_login: null })).toBeNull();
    expect(extractGiteaLoginTimestamp({ last_login: "" })).toBeNull();
  });

  it("treats the RFC3339 zero value as no login", () => {
    expect(
      extractGiteaLoginTimestamp({ last_login: "0001-01-01T00:00:00Z" }),
    ).toBeNull();
  });

  it("returns a Date when last_login is a valid ISO timestamp", () => {
    const parsed = extractGiteaLoginTimestamp({
      last_login: "2026-04-18T10:00:00Z",
    });

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toBe("2026-04-18T10:00:00.000Z");
  });

  it("returns null for unparseable strings", () => {
    expect(extractGiteaLoginTimestamp({ last_login: "not-a-date" })).toBeNull();
  });
});
