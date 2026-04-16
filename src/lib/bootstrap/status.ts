import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type BootstrapStatus = {
  hasAdminUser: boolean;
  hasWorkspaceSettings: boolean;
  requiresSetup: boolean;
  hasBootstrapToken: boolean;
};

type BuildBootstrapStatusInput = {
  adminCount: number;
  workspaceSettingsCount: number;
  bootstrapToken: string | null | undefined;
};

export function buildBootstrapStatus(
  input: BuildBootstrapStatusInput,
): BootstrapStatus {
  return {
    hasAdminUser: input.adminCount > 0,
    hasWorkspaceSettings: input.workspaceSettingsCount > 0,
    requiresSetup: input.adminCount === 0,
    hasBootstrapToken: Boolean(input.bootstrapToken),
  };
}

export async function readBootstrapStatus(): Promise<BootstrapStatus> {
  const [adminCount, workspaceSettingsCount] = await Promise.all([
    db.user.count({
      where: {
        role: "ADMIN",
      },
    }),
    db.workspaceSettings.count(),
  ]);

  return buildBootstrapStatus({
    adminCount,
    workspaceSettingsCount,
    bootstrapToken: env.BOOTSTRAP_TOKEN,
  });
}

export const getBootstrapStatus = cache(readBootstrapStatus);
