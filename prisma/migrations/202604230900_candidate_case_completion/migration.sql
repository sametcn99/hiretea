-- CreateEnum
CREATE TYPE "CandidateCaseCompletionSource" AS ENUM ('MANUAL', 'AUTO_DEADLINE');

-- AlterTable: CandidateCase candidate-completion fields
ALTER TABLE "CandidateCase"
ADD COLUMN "candidateCompletionRequestedAt" TIMESTAMP(3),
ADD COLUMN "candidateCompletionLockedAt" TIMESTAMP(3),
ADD COLUMN "candidateCompletionSource" "CandidateCaseCompletionSource";

-- AlterTable: GiteaIdentity observed-login fields
ALTER TABLE "GiteaIdentity"
ADD COLUMN "firstObservedLoginAt" TIMESTAMP(3),
ADD COLUMN "lastObservedLoginAt" TIMESTAMP(3);

-- Backfill legacy reviewable rows (REVIEWING / COMPLETED) so reviewers keep
-- visibility after the new candidate-completion gating lands.
UPDATE "CandidateCase"
SET
  "candidateCompletionRequestedAt" = COALESCE("reviewedAt", "submittedAt", "updatedAt"),
  "candidateCompletionSource" = 'MANUAL'
WHERE "status" IN ('REVIEWING', 'COMPLETED')
  AND "candidateCompletionRequestedAt" IS NULL;

-- Lock review-finalized rows so the candidate cannot reopen them retroactively.
UPDATE "CandidateCase"
SET "candidateCompletionLockedAt" = COALESCE("reviewedAt", "updatedAt")
WHERE "status" = 'COMPLETED'
  AND "candidateCompletionLockedAt" IS NULL;
