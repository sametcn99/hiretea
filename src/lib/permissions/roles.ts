import type { UserRole } from "@prisma/client";

const internalRoles = new Set<UserRole>(["ADMIN", "RECRUITER"]);

export function hasAnyRole(role: UserRole, allowedRoles: readonly UserRole[]) {
  return allowedRoles.includes(role);
}

export function isInternalRole(role: UserRole) {
  return internalRoles.has(role);
}
