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
      giteaOrganization: true,
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
      manualInviteMode: input.manualInviteMode,
      giteaBaseUrl: input.giteaBaseUrl,
      giteaOrganization: input.giteaOrganization,
    },
    select: {
      id: true,
      companyName: true,
      defaultBranch: true,
      manualInviteMode: true,
      giteaBaseUrl: true,
      giteaOrganization: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    action: "workspace.settings.updated",
    actorId: input.actorId,
    resourceType: "WorkspaceSettings",
    resourceId: nextSettings.id,
    detail: {
      previous: currentSettings,
      next: {
        companyName: nextSettings.companyName,
        defaultBranch: nextSettings.defaultBranch,
        manualInviteMode: nextSettings.manualInviteMode,
        giteaBaseUrl: nextSettings.giteaBaseUrl,
        giteaOrganization: nextSettings.giteaOrganization,
      },
    },
  });

  return nextSettings;
}
