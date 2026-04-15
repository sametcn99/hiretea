import { UserRole } from "@prisma/client";
import { hasAnyRole } from "@/lib/permissions/roles";

export type AuthorizedActor = {
  actorId: string;
  actorRole: UserRole;
};

const internalOperatorRoles = [UserRole.ADMIN, UserRole.RECRUITER] as const;

export function assertActorHasRole(
  actor: AuthorizedActor,
  allowedRoles: readonly UserRole[],
  action: string,
) {
  if (!hasAnyRole(actor.actorRole, allowedRoles)) {
    throw new Error(`You are not allowed to ${action}.`);
  }
}

export function assertInternalOperator(actor: AuthorizedActor, action: string) {
  assertActorHasRole(actor, internalOperatorRoles, action);
}
