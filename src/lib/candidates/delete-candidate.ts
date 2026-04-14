import { db } from "@/lib/db";
import { deleteCandidateAccount } from "@/lib/gitea/accounts";
import { GiteaAdminClientError } from "@/lib/gitea/client";

export async function deleteCandidate(candidateId: string, actorId: string) {
  const candidate = await db.user.findUniqueOrThrow({
    where: { id: candidateId },
    include: {
      giteaIdentity: true,
      candidateCases: true,
    },
  });

  // Because `candidateCases` has an onDelete: Restrict constraint on candidateId,
  // we do not physically delete the `User` from the database if cases exist.
  // Instead, we will archive the user by setting `isActive` to false and wiping
  // their Gitea identity (and actual Gitea account so they can't access it anymore).

  if (candidate.giteaIdentity) {
    try {
      await deleteCandidateAccount({
        actorId,
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
}
