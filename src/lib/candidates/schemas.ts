import { z } from "zod";

export const candidateProvisionSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(39)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, {
      message:
        "Use lowercase letters, numbers, periods, underscores, or hyphens. The username must start with a letter or number.",
    }),
});

export type CandidateProvisionInput = z.infer<typeof candidateProvisionSchema>;
