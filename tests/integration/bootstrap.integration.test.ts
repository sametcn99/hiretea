import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ensureWorkspaceBootstrap } from "@/lib/bootstrap/complete-bootstrap";
import { readBootstrapStatus } from "@/lib/bootstrap/status";
import { db } from "@/lib/db";
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

describe.skipIf(!shouldRunIntegrationTests)("ensureWorkspaceBootstrap", () => {
  it("creates the admin user, workspace settings, and audit log", async () => {
    const result = await ensureWorkspaceBootstrap(bootstrapInput);

    expect(result).toEqual({
      adminEmail: bootstrapInput.adminEmail,
      companyName: bootstrapInput.companyName,
    });

    const [status, adminUsers, workspaceSettings, auditLog] = await Promise.all(
      [
        readBootstrapStatus(),
        db.user.findMany({
          where: {
            role: UserRole.ADMIN,
          },
        }),
        db.workspaceSettings.findMany(),
        db.auditLog.findFirst({
          where: {
            action: "workspace.bootstrap.auto.completed",
          },
        }),
      ],
    );

    expect(status).toEqual({
      hasAdminUser: true,
      hasWorkspaceSettings: true,
      requiresSetup: false,
      hasBootstrapToken: true,
    });
    expect(adminUsers).toHaveLength(1);
    expect(adminUsers[0]).toMatchObject({
      email: bootstrapInput.adminEmail,
      isActive: true,
      role: UserRole.ADMIN,
    });
    expect(workspaceSettings).toHaveLength(1);
    expect(workspaceSettings[0]).toMatchObject({
      companyName: bootstrapInput.companyName,
      defaultBranch: bootstrapInput.defaultBranch,
      manualInviteMode: true,
      giteaBaseUrl: bootstrapInput.giteaBaseUrl,
      giteaAdminBaseUrl: bootstrapInput.giteaAdminBaseUrl,
      giteaOrganization: bootstrapInput.giteaOrganization,
      giteaAuthClientId: bootstrapInput.giteaAuthClientId,
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog?.detail).toMatchObject({
      adminEmail: bootstrapInput.adminEmail,
      companyName: bootstrapInput.companyName,
      defaultBranch: bootstrapInput.defaultBranch,
      manualInviteMode: true,
    });
  });

  it("is idempotent after the first successful bootstrap", async () => {
    await ensureWorkspaceBootstrap(bootstrapInput);

    const result = await ensureWorkspaceBootstrap({
      ...bootstrapInput,
      companyName: "Ignored Workspace Name",
    });

    expect(result).toEqual({
      adminEmail: bootstrapInput.adminEmail,
      companyName: bootstrapInput.companyName,
    });

    const [adminCount, workspaceSettingsCount, auditLogCount] =
      await Promise.all([
        db.user.count({
          where: {
            role: UserRole.ADMIN,
          },
        }),
        db.workspaceSettings.count(),
        db.auditLog.count({
          where: {
            action: "workspace.bootstrap.auto.completed",
          },
        }),
      ]);

    expect(adminCount).toBe(1);
    expect(workspaceSettingsCount).toBe(1);
    expect(auditLogCount).toBe(1);
  });
});
