import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { hasAnyRole, isInternalRole } from "@/lib/permissions/roles";

describe("hasAnyRole", () => {
  it("returns true when role is in the allowed list", () => {
    expect(hasAnyRole(UserRole.ADMIN, [UserRole.ADMIN])).toBe(true);
    expect(
      hasAnyRole(UserRole.RECRUITER, [UserRole.ADMIN, UserRole.RECRUITER]),
    ).toBe(true);
  });

  it("returns false when role is not in the allowed list", () => {
    expect(hasAnyRole(UserRole.CANDIDATE, [UserRole.ADMIN])).toBe(false);
    expect(
      hasAnyRole(UserRole.CANDIDATE, [UserRole.ADMIN, UserRole.RECRUITER]),
    ).toBe(false);
  });

  it("returns false for an empty allowed list", () => {
    expect(hasAnyRole(UserRole.ADMIN, [])).toBe(false);
  });
});

describe("isInternalRole", () => {
  it.each([
    [UserRole.ADMIN, true],
    [UserRole.RECRUITER, true],
    [UserRole.CANDIDATE, false],
  ])("classifies %s as internal=%s", (role, expected) => {
    expect(isInternalRole(role)).toBe(expected);
  });
});
