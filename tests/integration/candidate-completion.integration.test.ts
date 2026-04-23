import {
  CandidateCaseCompletionSource,
  CandidateCaseStatus,
  UserRole,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { syncExpiredCandidateCompletions } from "@/lib/candidate-cases/candidate-completion";
import { db } from "@/lib/db";
import { shouldRunIntegrationTests } from "./helpers/runtime";

type SeedOverrides = {
  status?: CandidateCaseStatus;
  dueAt?: Date | null;
  candidateCompletionRequestedAt?: Date | null;
  candidateCompletionLockedAt?: Date | null;
  candidateCompletionSource?: CandidateCaseCompletionSource | null;
};

async function seedCase(label: string, overrides: SeedOverrides = {}) {
  const admin = await db.user.create({
    data: {
      email: `admin-${label}@hiretea.test`,
      name: `Admin ${label}`,
      role: UserRole.ADMIN,
    },
  });

  const candidate = await db.user.create({
    data: {
      email: `candidate-${label}@hiretea.test`,
      name: `Candidate ${label}`,
      role: UserRole.CANDIDATE,
    },
  });

  const template = await db.caseTemplate.create({
    data: {
      slug: `template-${label}`,
      name: `Template ${label}`,
      summary: "Integration test template",
      repositoryOwner: "hiretea",
      repositoryName: `repo-${label}`,
      createdById: admin.id,
    },
  });

  const candidateCase = await db.candidateCase.create({
    data: {
      caseTemplateId: template.id,
      candidateId: candidate.id,
      createdById: admin.id,
      status: overrides.status ?? CandidateCaseStatus.IN_PROGRESS,
      dueAt: overrides.dueAt ?? null,
      candidateCompletionRequestedAt:
        overrides.candidateCompletionRequestedAt ?? null,
      candidateCompletionLockedAt:
        overrides.candidateCompletionLockedAt ?? null,
      candidateCompletionSource: overrides.candidateCompletionSource ?? null,
    },
  });

  return { admin, candidate, template, candidateCase };
}

describe.skipIf(!shouldRunIntegrationTests)(
  "syncExpiredCandidateCompletions",
  () => {
    it("auto-locks an untouched case when the deadline has passed", async () => {
      const dueAt = new Date("2026-04-01T00:00:00Z");
      const { candidateCase } = await seedCase("auto", { dueAt });

      const now = new Date("2026-04-02T00:00:00Z");
      const result = await syncExpiredCandidateCompletions(now);

      expect(result.autoLockedCount).toBe(1);
      expect(result.deadlineLockedCount).toBe(0);

      const updated = await db.candidateCase.findUniqueOrThrow({
        where: { id: candidateCase.id },
      });

      expect(updated.candidateCompletionRequestedAt?.toISOString()).toBe(
        now.toISOString(),
      );
      expect(updated.candidateCompletionLockedAt?.toISOString()).toBe(
        now.toISOString(),
      );
      expect(updated.candidateCompletionSource).toBe(
        CandidateCaseCompletionSource.AUTO_DEADLINE,
      );
    });

    it("locks a manually-marked case once the deadline passes without touching source", async () => {
      const dueAt = new Date("2026-04-01T00:00:00Z");
      const requestedAt = new Date("2026-03-25T12:00:00Z");
      const { candidateCase } = await seedCase("manual-lock", {
        dueAt,
        candidateCompletionRequestedAt: requestedAt,
        candidateCompletionSource: CandidateCaseCompletionSource.MANUAL,
      });

      const now = new Date("2026-04-02T00:00:00Z");
      const result = await syncExpiredCandidateCompletions(now);

      expect(result.autoLockedCount).toBe(0);
      expect(result.deadlineLockedCount).toBe(1);

      const updated = await db.candidateCase.findUniqueOrThrow({
        where: { id: candidateCase.id },
      });

      expect(updated.candidateCompletionRequestedAt?.toISOString()).toBe(
        requestedAt.toISOString(),
      );
      expect(updated.candidateCompletionLockedAt?.toISOString()).toBe(
        now.toISOString(),
      );
      expect(updated.candidateCompletionSource).toBe(
        CandidateCaseCompletionSource.MANUAL,
      );
    });

    it("does not auto-lock DRAFT or ARCHIVED cases", async () => {
      const dueAt = new Date("2026-04-01T00:00:00Z");
      const { candidateCase: draft } = await seedCase("draft-skip", {
        dueAt,
        status: CandidateCaseStatus.DRAFT,
      });
      const { candidateCase: archived } = await seedCase("archived-skip", {
        dueAt,
        status: CandidateCaseStatus.ARCHIVED,
      });

      const now = new Date("2026-04-02T00:00:00Z");
      const result = await syncExpiredCandidateCompletions(now);

      expect(result.autoLockedCount).toBe(0);
      expect(result.deadlineLockedCount).toBe(0);

      const draftAfter = await db.candidateCase.findUniqueOrThrow({
        where: { id: draft.id },
      });
      const archivedAfter = await db.candidateCase.findUniqueOrThrow({
        where: { id: archived.id },
      });

      expect(draftAfter.candidateCompletionRequestedAt).toBeNull();
      expect(draftAfter.candidateCompletionLockedAt).toBeNull();
      expect(archivedAfter.candidateCompletionRequestedAt).toBeNull();
      expect(archivedAfter.candidateCompletionLockedAt).toBeNull();
    });

    it("leaves cases without a deadline untouched", async () => {
      const { candidateCase } = await seedCase("no-due");

      const now = new Date("2026-04-02T00:00:00Z");
      const result = await syncExpiredCandidateCompletions(now);

      expect(result.autoLockedCount).toBe(0);
      expect(result.deadlineLockedCount).toBe(0);

      const updated = await db.candidateCase.findUniqueOrThrow({
        where: { id: candidateCase.id },
      });

      expect(updated.candidateCompletionRequestedAt).toBeNull();
      expect(updated.candidateCompletionLockedAt).toBeNull();
    });

    it("is idempotent — a second run does not re-lock already locked cases", async () => {
      const dueAt = new Date("2026-04-01T00:00:00Z");
      const { candidateCase } = await seedCase("idempotent", { dueAt });

      const firstRunAt = new Date("2026-04-02T00:00:00Z");
      const first = await syncExpiredCandidateCompletions(firstRunAt);
      expect(first.autoLockedCount).toBe(1);

      const secondRunAt = new Date("2026-04-03T00:00:00Z");
      const second = await syncExpiredCandidateCompletions(secondRunAt);

      expect(second.autoLockedCount).toBe(0);
      expect(second.deadlineLockedCount).toBe(0);

      const updated = await db.candidateCase.findUniqueOrThrow({
        where: { id: candidateCase.id },
      });

      expect(updated.candidateCompletionLockedAt?.toISOString()).toBe(
        firstRunAt.toISOString(),
      );
    });
  },
);
