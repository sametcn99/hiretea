import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ensureWorkspaceBootstrap } from "@/lib/bootstrap/complete-bootstrap";
import { db } from "@/lib/db";
import { updateWorkspaceSettings } from "@/lib/workspace-settings/update-workspace-settings";
import { shouldRunIntegrationTests } from "./helpers/runtime";

const bootstrapInput = {
  adminEmail: "admin@hiretea.test",
  adminName: "Integration Admin",
  companyName: "Integration Workspace",
  defaultBranch: "main",
  manualInviteMode: true,
  giteaBaseUrl: "http://localhost:3001",
  giteaAdminBaseUrl: "http://gitea:3000",
  giteaOrganization: "hiretea",
  giteaAuthClientId: "oauth-client",
};

describe.skipIf(!shouldRunIntegrationTests)("updateWorkspaceSettings", () => {
  it("updates the singleton settings row and records an audit log", async () => {
    await ensureWorkspaceBootstrap(bootstrapInput);

    const actor = await db.user.findFirstOrThrow({
      where: {
        role: UserRole.ADMIN,
      },
    });

    const updatedSettings = await updateWorkspaceSettings({
      actorId: actor.id,
      companyName: "Updated Workspace",
      defaultBranch: "stable",
      manualInviteMode: true,
      giteaBaseUrl: "http://localhost:3101",
      giteaAdminBaseUrl: "http://gitea:3100",
      giteaOrganization: "hiretea-updated",
      giteaAuthClientId: "oauth-client-updated",
    });

    expect(updatedSettings).toMatchObject({
      companyName: "Updated Workspace",
      defaultBranch: "stable",
      manualInviteMode: true,
      giteaBaseUrl: "http://localhost:3101",
      giteaAdminBaseUrl: "http://gitea:3100",
      giteaOrganization: "hiretea-updated",
      giteaAuthClientId: "oauth-client-updated",
    });

    const [workspaceSettings, auditLog] = await Promise.all([
      db.workspaceSettings.findFirstOrThrow(),
      db.auditLog.findFirstOrThrow({
        where: {
          action: "workspace.settings.updated",
        },
      }),
    ]);

    expect(workspaceSettings).toMatchObject({
      companyName: "Updated Workspace",
      defaultBranch: "stable",
      manualInviteMode: true,
      giteaBaseUrl: "http://localhost:3101",
      giteaAdminBaseUrl: "http://gitea:3100",
      giteaOrganization: "hiretea-updated",
      giteaAuthClientId: "oauth-client-updated",
    });
    expect(auditLog.detail).toMatchObject({
      previous: {
        companyName: bootstrapInput.companyName,
        defaultBranch: bootstrapInput.defaultBranch,
        manualInviteMode: true,
        giteaBaseUrl: bootstrapInput.giteaBaseUrl,
        giteaAdminBaseUrl: bootstrapInput.giteaAdminBaseUrl,
        giteaOrganization: bootstrapInput.giteaOrganization,
        giteaAuthClientId: bootstrapInput.giteaAuthClientId,
      },
      next: {
        companyName: "Updated Workspace",
        defaultBranch: "stable",
        manualInviteMode: true,
        giteaBaseUrl: "http://localhost:3101",
        giteaAdminBaseUrl: "http://gitea:3100",
        giteaOrganization: "hiretea-updated",
        giteaAuthClientId: "oauth-client-updated",
      },
    });
  });

  it("fails when the workspace has not been bootstrapped yet", async () => {
    const actor = await db.user.create({
      data: {
        email: "admin@hiretea.test",
        name: "Standalone Admin",
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    await expect(
      updateWorkspaceSettings({
        actorId: actor.id,
        companyName: "Updated Workspace",
        defaultBranch: "stable",
        manualInviteMode: true,
        giteaBaseUrl: "http://localhost:3101",
        giteaAdminBaseUrl: "http://gitea:3100",
        giteaOrganization: "hiretea-updated",
        giteaAuthClientId: "oauth-client-updated",
      }),
    ).rejects.toThrow(
      "Workspace settings are missing. Complete the first-run setup before editing them.",
    );
  });
});
