import { cache } from "react";
import { db } from "@/lib/db";

export const getWorkspaceSettings = cache(async () => {
  return db.workspaceSettings.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      companyName: true,
      defaultBranch: true,
      manualInviteMode: true,
      giteaBaseUrl: true,
      giteaOrganization: true,
      createdAt: true,
      updatedAt: true,
    },
  });
});

export async function getWorkspaceSettingsOrThrow() {
  const settings = await getWorkspaceSettings();

  if (!settings) {
    throw new Error(
      "Workspace settings are missing. Complete the first-run setup before assigning candidate cases.",
    );
  }

  return settings;
}
