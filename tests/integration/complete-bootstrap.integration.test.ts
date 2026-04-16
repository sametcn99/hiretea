import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { completeBootstrapSetup } from "@/lib/bootstrap/complete-bootstrap";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { shouldRunIntegrationTests } from "./helpers/runtime";

const baseInput = {
  adminEmail: "admin@hiretea.test",
  adminName: "Manual Setup Admin",
  companyName: "Manual Setup Workspace",
  defaultBranch: "main",
  manualInviteMode: true,
  giteaBaseUrl: "http://localhost:3001",
  giteaAdminBaseUrl: "http://gitea:3000",
  giteaOrganization: "hiretea",
  giteaAuthClientId: "oauth-client",
} as const;

describe.skipIf(!shouldRunIntegrationTests || !env.BOOTSTRAP_TOKEN)(
  "completeBootstrapSetup",
  () => {
    const bootstrapToken = env.BOOTSTRAP_TOKEN as string;

    it("creates an admin user, workspace settings, and audit log on success", async () => {
      const result = await completeBootstrapSetup({
        ...baseInput,
        bootstrapToken,
      });

      expect(result).toEqual({
        adminEmail: baseInput.adminEmail,
        companyName: baseInput.companyName,
      });

      const [admins, settings, auditLog] = await Promise.all([
        db.user.findMany({ where: { role: UserRole.ADMIN } }),
        db.workspaceSettings.findMany(),
        db.auditLog.findFirst({
          where: { action: "workspace.bootstrap.completed" },
        }),
      ]);

      expect(admins).toHaveLength(1);
      expect(admins[0]).toMatchObject({
        email: baseInput.adminEmail,
        name: baseInput.adminName,
        role: UserRole.ADMIN,
        isActive: true,
      });

      expect(settings).toHaveLength(1);
      expect(settings[0]).toMatchObject({
        companyName: baseInput.companyName,
        defaultBranch: baseInput.defaultBranch,
        manualInviteMode: true,
        giteaBaseUrl: baseInput.giteaBaseUrl,
        giteaAdminBaseUrl: baseInput.giteaAdminBaseUrl,
        giteaOrganization: baseInput.giteaOrganization,
        giteaAuthClientId: baseInput.giteaAuthClientId,
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.detail).toMatchObject({
        adminEmail: baseInput.adminEmail,
        companyName: baseInput.companyName,
        defaultBranch: baseInput.defaultBranch,
        manualInviteMode: true,
      });
    });

    it("rejects an invalid bootstrap token without mutating state", async () => {
      await expect(
        completeBootstrapSetup({
          ...baseInput,
          bootstrapToken: "definitely-not-the-real-token",
        }),
      ).rejects.toThrow("The bootstrap token is invalid.");

      const [adminCount, settingsCount, auditCount] = await Promise.all([
        db.user.count({ where: { role: UserRole.ADMIN } }),
        db.workspaceSettings.count(),
        db.auditLog.count(),
      ]);

      expect(adminCount).toBe(0);
      expect(settingsCount).toBe(0);
      expect(auditCount).toBe(0);
    });

    it("refuses to re-run once an admin already exists", async () => {
      await completeBootstrapSetup({ ...baseInput, bootstrapToken });

      await expect(
        completeBootstrapSetup({
          ...baseInput,
          adminEmail: "second-admin@hiretea.test",
          bootstrapToken,
        }),
      ).rejects.toThrow("The workspace is already initialized.");

      const adminEmails = (
        await db.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { email: true },
        })
      ).map((user) => user.email);

      expect(adminEmails).toEqual([baseInput.adminEmail]);
      expect(await db.workspaceSettings.count()).toBe(1);
    });

    it("reuses the existing workspace settings row when re-running after a partial failure", async () => {
      const existing = await db.workspaceSettings.create({
        data: {
          companyName: "Pre-existing",
          defaultBranch: "legacy",
          manualInviteMode: true,
          giteaBaseUrl: "http://legacy:3001",
          giteaAdminBaseUrl: null,
          giteaOrganization: "legacy-org",
          giteaAuthClientId: null,
        },
        select: { id: true },
      });

      await completeBootstrapSetup({ ...baseInput, bootstrapToken });

      const settings = await db.workspaceSettings.findMany({
        select: {
          id: true,
          companyName: true,
          defaultBranch: true,
        },
      });

      expect(settings).toHaveLength(1);
      expect(settings[0]).toMatchObject({
        id: existing.id,
        companyName: baseInput.companyName,
        defaultBranch: baseInput.defaultBranch,
      });
    });
  },
);
