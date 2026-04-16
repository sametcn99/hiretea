import { describe, expect, it } from "vitest";
import { bootstrapSetupSchema } from "@/lib/bootstrap/schemas";

const baseInput = {
  bootstrapToken: "token-value",
  adminName: "Ada Lovelace",
  adminEmail: "ada@example.com",
  companyName: "Hiretea",
  giteaBaseUrl: "http://localhost:3001",
  giteaAdminBaseUrl: "http://gitea:3000",
  giteaOrganization: "hiretea",
  giteaAuthClientId: "client-id",
  defaultBranch: "main",
  manualInviteMode: true,
};

describe("bootstrapSetupSchema", () => {
  it("accepts a fully populated valid payload", () => {
    const parsed = bootstrapSetupSchema.parse(baseInput);
    expect(parsed.companyName).toBe("Hiretea");
    expect(parsed.manualInviteMode).toBe(true);
    expect(parsed.defaultBranch).toBe("main");
  });

  it("defaults manualInviteMode to true when omitted", () => {
    const { manualInviteMode: _ignored, ...withoutFlag } = baseInput;
    const parsed = bootstrapSetupSchema.parse(withoutFlag);
    expect(parsed.manualInviteMode).toBe(true);
  });

  it("rejects an empty bootstrap token with the environment-prompt message", () => {
    const result = bootstrapSetupSchema.safeParse({
      ...baseInput,
      bootstrapToken: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain(
        "Enter the bootstrap token from your environment.",
      );
    }
  });

  it("rejects an invalid admin email", () => {
    const result = bootstrapSetupSchema.safeParse({
      ...baseInput,
      adminEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too-short company names", () => {
    const result = bootstrapSetupSchema.safeParse({
      ...baseInput,
      companyName: "H",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed gitea base URLs", () => {
    const result = bootstrapSetupSchema.safeParse({
      ...baseInput,
      giteaBaseUrl: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed optional gitea admin base URLs with the custom message", () => {
    const result = bootstrapSetupSchema.safeParse({
      ...baseInput,
      giteaAdminBaseUrl: "not a url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Enter a valid URL.");
    }
  });

  it("rejects gitea organization slugs containing spaces", () => {
    const result = bootstrapSetupSchema.safeParse({
      ...baseInput,
      giteaOrganization: "has space",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Use the Gitea organization slug.");
    }
  });

  it("rejects invalid git branch names", () => {
    const result = bootstrapSetupSchema.safeParse({
      ...baseInput,
      defaultBranch: "bad branch",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Use a valid git branch name.");
    }
  });

  it("accepts omitted optional admin fields", () => {
    const {
      adminName: _adminName,
      giteaAdminBaseUrl: _admin,
      giteaAuthClientId: _auth,
      ...minimal
    } = baseInput;
    const parsed = bootstrapSetupSchema.parse(minimal);
    expect(parsed.adminName).toBeUndefined();
    expect(parsed.giteaAdminBaseUrl).toBeUndefined();
    expect(parsed.giteaAuthClientId).toBeUndefined();
  });
});
