import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const repositoryPattern = /^[a-z0-9][a-z0-9._-]*$/;

export type CaseTemplateRubricCriterionInput = {
  title: string;
  description?: string;
  weight?: number;
};

function parseCaseTemplateRubricCriteria(
  value: string,
  context: z.RefinementCtx,
): CaseTemplateRubricCriterionInput[] {
  const criteria: CaseTemplateRubricCriterionInput[] = [];
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const [index, line] of lines.entries()) {
    const [titleRaw, descriptionRaw, weightRaw, ...extraParts] = line
      .split("|")
      .map((part) => part.trim());

    if (extraParts.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Rubric line ${index + 1} must use Title | Guidance | Weight.`,
      });
      continue;
    }

    if (!titleRaw) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Rubric line ${index + 1} is missing a criterion title.`,
      });
      continue;
    }

    let weight: number | undefined;

    if (weightRaw) {
      const parsedWeight = Number.parseInt(weightRaw, 10);

      if (
        !Number.isInteger(parsedWeight) ||
        parsedWeight < 1 ||
        parsedWeight > 100
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Rubric line ${index + 1} must use a whole-number weight between 1 and 100.`,
        });
        continue;
      }

      weight = parsedWeight;
    }

    criteria.push({
      title: titleRaw,
      description: descriptionRaw || undefined,
      weight,
    });
  }

  return criteria;
}

const optionalTemplateReviewText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .trim()
      .max(max)
      .transform((value) => value || undefined),
  );

const reviewerIdsSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value ? [value] : [];
    }

    return [];
  },
  z
    .array(z.string().trim().min(1))
    .transform((reviewerIds) => [...new Set(reviewerIds)]),
);

export const caseTemplateCreateSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(64).regex(slugPattern, {
    message:
      "Use lowercase letters, numbers, and single hyphens between words.",
  }),
  summary: z.string().trim().min(16).max(280),
  repositoryName: z.string().trim().min(3).max(100).regex(repositoryPattern, {
    message:
      "Use lowercase letters, numbers, periods, underscores, or hyphens for the repository name.",
  }),
  repositoryDescription: z
    .string()
    .trim()
    .max(280)
    .optional()
    .transform((value) => value || undefined),
  defaultBranch: z.string().trim().min(2).max(32),
  reviewerInstructions: optionalTemplateReviewText(2000),
  decisionGuidance: optionalTemplateReviewText(1200),
  reviewerIds: reviewerIdsSchema,
  rubricCriteria: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .transform((value, context) =>
        parseCaseTemplateRubricCriteria(value, context),
      ),
  ),
});

export type CaseTemplateCreateInput = z.infer<typeof caseTemplateCreateSchema>;
