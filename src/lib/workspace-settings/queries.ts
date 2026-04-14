import { WorkspaceGiteaMode } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";

function mapWorkspaceSettingsRecord(settings: {
  id: string;
  companyName: string;
  defaultBranch: string;
  manualInviteMode: boolean;
  giteaMode: WorkspaceGiteaMode;
  giteaBaseUrl: string;
  giteaAdminBaseUrl: string | null;
  giteaOrganization: string;
  giteaAuthClientId: string | null;
  createdAt: Date;
  updatedAt: Date;
  giteaConfigSecret: { id: string } | null;
}) {
  const giteaMode: "bundled" | "external" =
    settings.giteaMode === WorkspaceGiteaMode.EXTERNAL ? "external" : "bundled";

  return {
    id: settings.id,
    companyName: settings.companyName,
    defaultBranch: settings.defaultBranch,
    manualInviteMode: settings.manualInviteMode,
    giteaMode,
    giteaBaseUrl: settings.giteaBaseUrl,
    giteaAdminBaseUrl: settings.giteaAdminBaseUrl,
    giteaOrganization: settings.giteaOrganization,
    giteaAuthClientId: settings.giteaAuthClientId,
    hasStoredExternalSecrets: Boolean(settings.giteaConfigSecret),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export const getWorkspaceSettings = cache(async () => {
  const settings = await db.workspaceSettings.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      companyName: true,
      defaultBranch: true,
      manualInviteMode: true,
      giteaMode: true,
      giteaBaseUrl: true,
      giteaAdminBaseUrl: true,
      giteaOrganization: true,
      giteaAuthClientId: true,
      giteaConfigSecret: {
        select: {
          id: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  return settings ? mapWorkspaceSettingsRecord(settings) : null;
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
