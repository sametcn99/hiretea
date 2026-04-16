import { describe, expect, it } from "vitest";
import { buildBootstrapStatus } from "@/lib/bootstrap/status";

describe("buildBootstrapStatus", () => {
  it("marks setup as pending when no admin exists", () => {
    expect(
      buildBootstrapStatus({
        adminCount: 0,
        workspaceSettingsCount: 0,
        bootstrapToken: undefined,
      }),
    ).toEqual({
      hasAdminUser: false,
      hasWorkspaceSettings: false,
      requiresSetup: true,
      hasBootstrapToken: false,
    });
  });

  it("marks setup as complete when admin and workspace settings exist", () => {
    expect(
      buildBootstrapStatus({
        adminCount: 1,
        workspaceSettingsCount: 1,
        bootstrapToken: "bootstrap-token",
      }),
    ).toEqual({
      hasAdminUser: true,
      hasWorkspaceSettings: true,
      requiresSetup: false,
      hasBootstrapToken: true,
    });
  });

  it("reports admin presence without workspace settings", () => {
    const status = buildBootstrapStatus({
      adminCount: 2,
      workspaceSettingsCount: 0,
      bootstrapToken: "token",
    });
    expect(status.hasAdminUser).toBe(true);
    expect(status.hasWorkspaceSettings).toBe(false);
    expect(status.requiresSetup).toBe(false);
  });

  it("reports workspace settings without admins as still requiring setup", () => {
    const status = buildBootstrapStatus({
      adminCount: 0,
      workspaceSettingsCount: 1,
      bootstrapToken: "token",
    });
    expect(status.hasWorkspaceSettings).toBe(true);
    expect(status.requiresSetup).toBe(true);
  });

  it("treats an empty-string bootstrap token as missing", () => {
    expect(
      buildBootstrapStatus({
        adminCount: 1,
        workspaceSettingsCount: 1,
        bootstrapToken: "",
      }).hasBootstrapToken,
    ).toBe(false);
  });

  it("treats null bootstrap token as missing", () => {
    expect(
      buildBootstrapStatus({
        adminCount: 1,
        workspaceSettingsCount: 1,
        bootstrapToken: null,
      }).hasBootstrapToken,
    ).toBe(false);
  });

  it("uses strict boundary logic for admin and workspace settings counts", () => {
    expect(
      buildBootstrapStatus({
        adminCount: 1,
        workspaceSettingsCount: 0,
        bootstrapToken: null,
      }),
    ).toMatchObject({
      hasAdminUser: true,
      hasWorkspaceSettings: false,
      requiresSetup: false,
    });
    expect(
      buildBootstrapStatus({
        adminCount: 0,
        workspaceSettingsCount: 5,
        bootstrapToken: null,
      }),
    ).toMatchObject({
      hasAdminUser: false,
      hasWorkspaceSettings: true,
      requiresSetup: true,
    });
  });
});
