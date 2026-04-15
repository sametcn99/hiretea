import { CandidateCaseStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import {
  type AuthorizedActor,
  assertInternalOperator,
} from "@/lib/auth/authorization";
import { revokeCandidateCaseAccess } from "@/lib/candidate-cases/revoke-case-access";
import { db } from "@/lib/db";
import { deleteCandidateAccount } from "@/lib/gitea/accounts";
import { GiteaAdminClientError } from "@/lib/gitea/client";

const activeCandidateCaseStatuses = new Set<CandidateCaseStatus>([
  CandidateCaseStatus.DRAFT,
  CandidateCaseStatus.PROVISIONING,
  CandidateCaseStatus.READY,
  CandidateCaseStatus.IN_PROGRESS,
  CandidateCaseStatus.REVIEWING,
]);

export async function deleteCandidate(
  candidateId: string,
  actor: AuthorizedActor,
) {
  assertInternalOperator(actor, "archive candidates");

  const candidate = await db.user.findUniqueOrThrow({
    where: { id: candidateId },
    include: {
      giteaIdentity: true,
      candidateCases: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const activeCaseIds = candidate.candidateCases
    .filter((candidateCase) =>
      activeCandidateCaseStatuses.has(candidateCase.status),
    )
    .map((candidateCase) => candidateCase.id);

  for (const caseId of activeCaseIds) {
    await revokeCandidateCaseAccess(caseId, actor);
  }

  // Because `candidateCases` has an onDelete: Restrict constraint on candidateId,
  // we do not physically delete the `User` from the database if cases exist.
  // Instead, we will archive the user by setting `isActive` to false and wiping
  // their Gitea identity (and actual Gitea account so they can't access it anymore).

  if (candidate.giteaIdentity) {
    try {
      await deleteCandidateAccount({
        actorId: actor.actorId,
        username: candidate.giteaIdentity.login,
      });
    } catch (e: unknown) {
      if (e instanceof GiteaAdminClientError && e.status === 404) {
        // Already deleted or not found
      } else {
        throw e;
      }
    }
  }

  // Proceed with safe DB cleanup. We don't want to hard-delete the User if cases are attached
  // So we do a soft-delete mechanism just marking inactive and wiping auth references.
  await db.$transaction([
    // Delete their GiteaIdentity so it frees up the Gitea linkage
    db.giteaIdentity.deleteMany({
      where: { userId: candidateId },
    }),
    // Delete related accounts/sessions to force logout the candidate (even if they had any)
    db.account.deleteMany({
      where: { userId: candidateId },
    }),
    db.session.deleteMany({
      where: { userId: candidateId },
    }),
    // Mark as inactive in Hiretea UI
    db.user.update({
      where: { id: candidateId },
      data: {
        isActive: false,
      },
    }),
  ]);

  await createAuditLog({
    action: "candidate.archived",
    actorId: actor.actorId,
    resourceType: "Candidate",
    resourceId: candidate.id,
    detail: {
      email: candidate.email,
      giteaLogin: candidate.giteaIdentity?.login ?? null,
      revokedActiveCaseCount: activeCaseIds.length,
    },
  });
}
