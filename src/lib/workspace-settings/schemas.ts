import { z } from "zod";

const branchPattern = /^[A-Za-z0-9._/-]+$/;
const organizationPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const workspaceSettingsUpdateSchema = z.object({
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

export type WorkspaceSettingsUpdateInput = z.infer<
  typeof workspaceSettingsUpdateSchema
>;
