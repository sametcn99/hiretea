import { CandidateCaseDecision } from "@prisma/client";
import { z } from "zod";

export const evaluationNoteCreateSchema = z
  .object({
    candidateCaseId: z.string().trim().min(1, "Select a candidate case."),
    score: z.coerce.number().int().min(1).max(10),
    summary: z.string().trim().min(12).max(160),
    note: z
      .string()
      .trim()
      .max(4000)
      .optional()
      .transform((value) => value || undefined),
    decision: z.preprocess(
      (value) =>
        typeof value === "string" && value.length === 0 ? undefined : value,
      z.nativeEnum(CandidateCaseDecision).optional(),
    ),
    finalizeReview: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.finalizeReview && !value.decision) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a decision before completing the review.",
        path: ["decision"],
      });
    }

    if (!value.finalizeReview && value.decision) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A decision can only be set when the review is completed.",
        path: ["decision"],
      });
    }
  });

export type EvaluationNoteCreateInput = z.infer<
  typeof evaluationNoteCreateSchema
>;
