import { describe, expect, it } from "vitest";
import { workspaceSettingsUpdateSchema } from "@/lib/workspace-settings/schemas";

const baseInput = {
  companyName: "Hiretea",
  giteaBaseUrl: "http://localhost:3001",
  giteaAdminBaseUrl: "http://gitea:3000",
  giteaOrganization: "hiretea",
  giteaAuthClientId: "client-id",
  defaultBranch: "main",
  manualInviteMode: true,
};

describe("workspaceSettingsUpdateSchema", () => {
  it("parses a valid payload", () => {
    expect(workspaceSettingsUpdateSchema.parse(baseInput).companyName).toBe(
      "Hiretea",
    );
  });

  it("rejects an invalid gitea base URL", () => {
    const result = workspaceSettingsUpdateSchema.safeParse({
      ...baseInput,
      giteaBaseUrl: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects bad organization slugs", () => {
    const result = workspaceSettingsUpdateSchema.safeParse({
      ...baseInput,
      giteaOrganization: "has space",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Use the Gitea organization slug.");
    }
  });

  it("rejects invalid default branch names", () => {
    const result = workspaceSettingsUpdateSchema.safeParse({
      ...baseInput,
      defaultBranch: "bad branch",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too-short company names", () => {
    const result = workspaceSettingsUpdateSchema.safeParse({
      ...baseInput,
      companyName: "H",
    });
    expect(result.success).toBe(false);
  });
});
