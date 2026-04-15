import {
  type AuthorizedActor,
  assertInternalOperator,
} from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { GiteaAdminClientError } from "@/lib/gitea/client";
import { revokeRepositoryAccess } from "@/lib/gitea/permissions";
import { getWorkspaceSettings } from "@/lib/workspace-settings/queries";

export async function revokeCandidateCaseAccess(
  caseId: string,
  actor: AuthorizedActor,
) {
  assertInternalOperator(actor, "revoke candidate repository access");

  const caseRecord = await db.candidateCase.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      candidate: { include: { giteaIdentity: true } },
    },
  });

  if (!caseRecord.workingRepository || !caseRecord.candidate.giteaIdentity) {
    return;
  }

  const settings = await getWorkspaceSettings();
  if (!settings) {
    throw new Error("Workspace settings not found.");
  }

  try {
    await revokeRepositoryAccess({
      actorId: actor.actorId,
      owner: settings.giteaOrganization,
      repositoryName: caseRecord.workingRepository,
      username: caseRecord.candidate.giteaIdentity.login,
    });
  } catch (e: unknown) {
    if (e instanceof GiteaAdminClientError && e.status === 404) {
      // 404 means already revoked or repo omitted. That's fine.
    } else {
      throw e;
    }
  }

  // Update DB grants assuming the previous were all active
  await db.candidateAccessGrant.updateMany({
    where: {
      candidateCaseId: caseId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
