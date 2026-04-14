import { z } from "zod";

const branchPattern = /^[A-Za-z0-9._/-]+$/;
const organizationPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const giteaModeSchema = z.enum(["bundled", "external"]);

const optionalUrlField = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || z.string().url().safeParse(value).success, {
    message: "Enter a valid URL.",
  });

const optionalSecretField = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

export const workspaceSettingsUpdateSchema = z
  .object({
    companyName: z.string().trim().min(2).max(80),
    giteaMode: giteaModeSchema,
    giteaBaseUrl: z.string().trim().url(),
    giteaAdminBaseUrl: optionalUrlField,
    giteaOrganization: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(organizationPattern, {
        message: "Use the Gitea organization slug.",
      }),
    giteaAuthClientId: optionalSecretField,
    giteaAuthClientSecret: optionalSecretField,
    giteaAdminToken: optionalSecretField,
    giteaWebhookSecret: optionalSecretField,
    defaultBranch: z.string().trim().min(2).max(32).regex(branchPattern, {
      message: "Use a valid git branch name.",
    }),
    manualInviteMode: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (value.giteaMode !== "external") {
      return;
    }

    if (!value.giteaAuthClientId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["giteaAuthClientId"],
        message: "Enter the external Gitea OAuth client ID.",
      });
    }
  });

export type WorkspaceSettingsUpdateInput = z.infer<
  typeof workspaceSettingsUpdateSchema
>;
