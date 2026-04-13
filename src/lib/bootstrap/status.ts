import { UserRole } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type BootstrapStatus = {
  hasAdminUser: boolean;
  hasWorkspaceSettings: boolean;
  requiresSetup: boolean;
  hasBootstrapToken: boolean;
};

export const getBootstrapStatus = cache(async (): Promise<BootstrapStatus> => {
  const [adminCount, workspaceSettingsCount] = await Promise.all([
    db.user.count({
      where: {
        role: UserRole.ADMIN,
      },
    }),
    db.workspaceSettings.count(),
  ]);

  return {
    hasAdminUser: adminCount > 0,
    hasWorkspaceSettings: workspaceSettingsCount > 0,
    requiresSetup: adminCount === 0,
    hasBootstrapToken: Boolean(env.BOOTSTRAP_TOKEN),
  };
});
