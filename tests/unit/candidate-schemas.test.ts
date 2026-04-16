import { describe, expect, it } from "vitest";
import { candidateCaseCreateSchema } from "@/lib/candidate-cases/schemas";
import { candidateProvisionSchema } from "@/lib/candidates/schemas";
import { caseTemplateCreateSchema } from "@/lib/case-templates/schemas";
import { evaluationNoteCreateSchema } from "@/lib/evaluation-notes/schemas";

const PASS_DECISION = "ADVANCE" as const;

describe("candidateProvisionSchema", () => {
  it("accepts a well-formed candidate", () => {
    const parsed = candidateProvisionSchema.parse({
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      username: "ada-lovelace",
    });
    expect(parsed.username).toBe("ada-lovelace");
  });

  it("rejects usernames that start with a symbol", () => {
    const result = candidateProvisionSchema.safeParse({
      displayName: "Ada",
      email: "ada@example.com",
      username: "-ada",
    });
    expect(result.success).toBe(false);
  });

  it("rejects usernames with uppercase characters", () => {
    const result = candidateProvisionSchema.safeParse({
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      username: "Ada",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = candidateProvisionSchema.safeParse({
      displayName: "Ada Lovelace",
      email: "not-an-email",
      username: "ada",
    });
    expect(result.success).toBe(false);
  });
});

describe("candidateCaseCreateSchema", () => {
  it("converts a YYYY-MM-DD due date to an end-of-day Date in UTC", () => {
    const parsed = candidateCaseCreateSchema.parse({
      candidateId: "cand-1",
      caseTemplateId: "tmpl-1",
      dueAt: "2025-06-15",
    });

    expect(parsed.dueAt).toBeInstanceOf(Date);
    expect((parsed.dueAt as Date).toISOString()).toBe(
      "2025-06-15T23:59:59.999Z",
    );
  });

  it("treats a blank dueAt as undefined", () => {
    const parsed = candidateCaseCreateSchema.parse({
      candidateId: "cand-1",
      caseTemplateId: "tmpl-1",
      dueAt: "",
    });
    expect(parsed.dueAt).toBeUndefined();
  });

  it("rejects due dates that are not YYYY-MM-DD", () => {
    const result = candidateCaseCreateSchema.safeParse({
      candidateId: "cand-1",
      caseTemplateId: "tmpl-1",
      dueAt: "15-06-2025",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Use a valid due date.");
    }
  });

  it("requires a candidate and template selection", () => {
    const result = candidateCaseCreateSchema.safeParse({
      candidateId: "",
      caseTemplateId: "",
      dueAt: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("caseTemplateCreateSchema", () => {
  const base = {
    name: "Backend Code Review",
    slug: "backend-code-review",
    summary: "Review a small Node.js service for bugs and code quality.",
    repositoryName: "backend-code-review",
    repositoryDescription: "Starter repo",
    defaultBranch: "main",
    reviewerInstructions: "",
    decisionGuidance: "",
    rubricCriteria: "",
  };

  it("parses a minimal template and applies the default branch", () => {
    const parsed = caseTemplateCreateSchema.parse({
      ...base,
      defaultBranch: undefined as unknown as string,
    });
    expect(parsed.defaultBranch).toBe("main");
    expect(parsed.rubricCriteria).toEqual([]);
  });

  it("parses pipe-delimited rubric criteria with optional weight", () => {
    const parsed = caseTemplateCreateSchema.parse({
      ...base,
      rubricCriteria:
        "Correctness | Does the code work? | 60\nReadability | Is the code clear? | 40",
    });

    expect(parsed.rubricCriteria).toEqual([
      {
        title: "Correctness",
        description: "Does the code work?",
        weight: 60,
      },
      {
        title: "Readability",
        description: "Is the code clear?",
        weight: 40,
      },
    ]);
  });

  it("rejects rubric weights outside 1-100", () => {
    const result = caseTemplateCreateSchema.safeParse({
      ...base,
      rubricCriteria: "Scale | Notes | 101",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rubric lines that are missing a title", () => {
    const result = caseTemplateCreateSchema.safeParse({
      ...base,
      rubricCriteria: " | Only description | 10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slugs with uppercase characters", () => {
    const result = caseTemplateCreateSchema.safeParse({
      ...base,
      slug: "Backend-Review",
    });
    expect(result.success).toBe(false);
  });

  it("rejects repository names starting with a hyphen", () => {
    const result = caseTemplateCreateSchema.safeParse({
      ...base,
      repositoryName: "-bad",
    });
    expect(result.success).toBe(false);
  });
});

describe("evaluationNoteCreateSchema", () => {
  const base = {
    candidateCaseId: "case-1",
    score: 7,
    summary: "Solid overall, minor concerns.",
    note: "Longer note here",
    finalizeReview: false,
  };

  it("accepts a draft note without a decision", () => {
    const parsed = evaluationNoteCreateSchema.parse(base);
    expect(parsed.finalizeReview).toBe(false);
    expect(parsed.decision).toBeUndefined();
  });

  it("coerces string scores to integers", () => {
    const parsed = evaluationNoteCreateSchema.parse({
      ...base,
      score: "8" as unknown as number,
    });
    expect(parsed.score).toBe(8);
  });

  it("requires a decision when finalizing the review", () => {
    const result = evaluationNoteCreateSchema.safeParse({
      ...base,
      finalizeReview: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain(
        "Select a decision before completing the review.",
      );
    }
  });

  it("rejects a decision on a non-final note", () => {
    const result = evaluationNoteCreateSchema.safeParse({
      ...base,
      finalizeReview: false,
      decision: PASS_DECISION,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain(
        "A decision can only be set when the review is completed.",
      );
    }
  });

  it("accepts a finalized review with a decision", () => {
    const parsed = evaluationNoteCreateSchema.parse({
      ...base,
      finalizeReview: true,
      decision: PASS_DECISION,
    });
    expect(parsed.finalizeReview).toBe(true);
    expect(parsed.decision).toBe(PASS_DECISION);
  });

  it("rejects scores outside the 1-10 range", () => {
    expect(
      evaluationNoteCreateSchema.safeParse({ ...base, score: 0 }).success,
    ).toBe(false);
    expect(
      evaluationNoteCreateSchema.safeParse({ ...base, score: 11 }).success,
    ).toBe(false);
  });
});
