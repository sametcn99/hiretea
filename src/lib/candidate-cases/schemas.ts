import { z } from "zod";

const dueAtPattern = /^\d{4}-\d{2}-\d{2}$/;

export const candidateCaseCreateSchema = z.object({
  candidateId: z.string().trim().min(1, "Select a candidate."),
  caseTemplateId: z.string().trim().min(1, "Select a case template."),
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

export type CandidateCaseCreateInput = z.infer<
  typeof candidateCaseCreateSchema
>;
