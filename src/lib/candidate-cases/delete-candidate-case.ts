import { db } from "@/lib/db";
import { GiteaAdminClientError } from "@/lib/gitea/client";
import { deleteCaseRepository } from "@/lib/gitea/repositories";

export async function deleteCandidateCase(caseId: string, actorId: string) {
  const caseRecord = await db.candidateCase.findUniqueOrThrow({
    where: { id: caseId },
    include: { caseTemplate: true },
  });

  if (caseRecord.workingRepository) {
    try {
      await deleteCaseRepository({
        actorId,
        repositoryName: caseRecord.workingRepository,
      });
    } catch (e: unknown) {
      if (e instanceof GiteaAdminClientError && e.status === 404) {
        // Repository already deleted or doesn't exist, ignore
      } else {
        throw e;
      }
    }
  }

  // Delete the case from the database
  // Due to Cascade settings, this will also delete associated EvaluationNotes and AccessGrants
  await db.candidateCase.delete({
    where: { id: caseId },
  });
}
