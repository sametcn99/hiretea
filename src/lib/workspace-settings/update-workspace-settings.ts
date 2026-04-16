import { createAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import type { WorkspaceSettingsUpdateInput } from "@/lib/workspace-settings/schemas";

type UpdateWorkspaceSettingsParams = WorkspaceSettingsUpdateInput & {
  actorId: string;
};

export async function updateWorkspaceSettings(
  input: UpdateWorkspaceSettingsParams,
) {
  const currentSettings = await db.workspaceSettings.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      companyName: true,
      defaultBranch: true,
      manualInviteMode: true,
      giteaBaseUrl: true,
      giteaAdminBaseUrl: true,
      giteaOrganization: true,
      giteaAuthClientId: true,
    },
  });

  if (!currentSettings) {
    throw new Error(
      "Workspace settings are missing. Complete the first-run setup before editing them.",
    );
  }

  const nextSettings = await db.workspaceSettings.update({
    where: {
      id: currentSettings.id,
    },
    data: {
      companyName: input.companyName,
      defaultBranch: input.defaultBranch,
      manualInviteMode: true,
      giteaBaseUrl: input.giteaBaseUrl,
      giteaAdminBaseUrl: input.giteaAdminBaseUrl ?? null,
      giteaOrganization: input.giteaOrganization,
      giteaAuthClientId: input.giteaAuthClientId ?? null,
    },
    select: {
      id: true,
      companyName: true,
      defaultBranch: true,
      manualInviteMode: true,
      giteaBaseUrl: true,
      giteaAdminBaseUrl: true,
      giteaOrganization: true,
      giteaAuthClientId: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    action: "workspace.settings.updated",
    actorId: input.actorId,
    resourceType: "WorkspaceSettings",
    resourceId: nextSettings.id,
    detail: {
      previous: {
        companyName: currentSettings.companyName,
        defaultBranch: currentSettings.defaultBranch,
        manualInviteMode: currentSettings.manualInviteMode,
        giteaBaseUrl: currentSettings.giteaBaseUrl,
        giteaAdminBaseUrl: currentSettings.giteaAdminBaseUrl,
        giteaOrganization: currentSettings.giteaOrganization,
        giteaAuthClientId: currentSettings.giteaAuthClientId,
      },
      next: {
        companyName: nextSettings.companyName,
        defaultBranch: nextSettings.defaultBranch,
        manualInviteMode: true,
        giteaBaseUrl: nextSettings.giteaBaseUrl,
        giteaAdminBaseUrl: nextSettings.giteaAdminBaseUrl,
        giteaOrganization: nextSettings.giteaOrganization,
        giteaAuthClientId: nextSettings.giteaAuthClientId,
      },
    },
  });

  return nextSettings;
}
