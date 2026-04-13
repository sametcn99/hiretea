import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const repositoryPattern = /^[a-z0-9][a-z0-9._-]*$/;

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
  defaultBranch: z.string().trim().min(2).max(32).default("main"),
});

export type CaseTemplateCreateInput = z.infer<typeof caseTemplateCreateSchema>;
