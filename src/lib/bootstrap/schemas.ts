import { z } from "zod";

const branchPattern = /^[A-Za-z0-9._/-]+$/;
const organizationPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const bootstrapSetupSchema = z.object({
  bootstrapToken: z
    .string()
    .trim()
    .min(1, "Enter the bootstrap token from your environment."),
  adminName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || undefined),
  adminEmail: z.string().trim().email(),
  companyName: z.string().trim().min(2).max(80),
  giteaBaseUrl: z.string().trim().url(),
  giteaOrganization: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(organizationPattern, {
      message: "Use the Gitea organization slug.",
    }),
  defaultBranch: z.string().trim().min(2).max(32).regex(branchPattern, {
    message: "Use a valid git branch name.",
  }),
  manualInviteMode: z.boolean().default(true),
});

export type BootstrapSetupInput = z.infer<typeof bootstrapSetupSchema>;
