import { z } from "zod";

const dueAtPattern = /^\d{4}-\d{2}-\d{2}$/;

const reviewerIdsSchema = z.preprocess(
  (value) => {
    const values = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? [value]
        : [];

    return [...new Set(values)]
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  },
  z.array(z.string().trim().min(1)).min(1, "Select at least one reviewer."),
);

const candidateCaseMutationSchema = z.object({
  candidateId: z.string().trim().min(1, "Select a candidate."),
  caseTemplateId: z.string().trim().min(1, "Select a case template."),
  reviewerIds: reviewerIdsSchema,
  dueAt: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : ""),
      z.string(),
    )
    .transform((value, context) => {
      if (value.length === 0) {
        return undefined;
      }

      if (!dueAtPattern.test(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use a valid due date.",
        });

        return z.NEVER;
      }

      const dueAt = new Date(`${value}T23:59:59.999Z`);

      if (Number.isNaN(dueAt.getTime())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use a valid due date.",
        });

        return z.NEVER;
      }

      return dueAt;
    }),
});

export const candidateCaseCreateSchema = candidateCaseMutationSchema;

export const candidateCaseUpdateSchema = candidateCaseMutationSchema;

export type CandidateCaseCreateInput = z.infer<
  typeof candidateCaseCreateSchema
>;

export type CandidateCaseUpdateInput = z.infer<
  typeof candidateCaseUpdateSchema
>;
