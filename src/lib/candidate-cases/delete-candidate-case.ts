import { CandidateCaseStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import {
  type AuthorizedActor,
  assertInternalOperator,
} from "@/lib/auth/authorization";
import { revokeCandidateCaseAccess } from "@/lib/candidate-cases/revoke-case-access";
import { db } from "@/lib/db";

export async function deleteCandidateCase(
  caseId: string,
  actor: AuthorizedActor,
) {
  assertInternalOperator(actor, "delete candidate cases");

  const caseRecord = await db.candidateCase.findUniqueOrThrow({
    where: { id: caseId },
    select: {
      id: true,
      candidateId: true,
      status: true,
      workingRepository: true,
      caseTemplate: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (caseRecord.status === CandidateCaseStatus.ARCHIVED) {
    throw new Error("The selected candidate case is already archived.");
  }

  if (caseRecord.workingRepository) {
    await revokeCandidateCaseAccess(caseId, actor);
  }

  await db.candidateCase.update({
    where: { id: caseId },
    data: {
      status: CandidateCaseStatus.ARCHIVED,
      lastSyncedAt: new Date(),
    },
  });

  await createAuditLog({
    action: "candidate.case.archived",
    actorId: actor.actorId,
    resourceType: "CandidateCase",
    resourceId: caseRecord.id,
    detail: {
      candidateId: caseRecord.candidateId,
      repositoryName: caseRecord.workingRepository,
      previousStatus: caseRecord.status,
      nextStatus: CandidateCaseStatus.ARCHIVED,
      repositoryRetained: Boolean(caseRecord.workingRepository),
      templateId: caseRecord.caseTemplate.id,
      templateName: caseRecord.caseTemplate.name,
    },
  });
}
