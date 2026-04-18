-- CreateEnum
CREATE TYPE "CaseTemplateRepositorySourceKind" AS ENUM (
  'PROVISIONED',
  'LINKED_EXISTING',
  'COPIED_FROM_EXISTING'
);

-- AlterTable
ALTER TABLE "CaseTemplate"
ADD COLUMN "repositoryOwner" TEXT,
ADD COLUMN "repositorySourceKind" "CaseTemplateRepositorySourceKind" NOT NULL DEFAULT 'PROVISIONED',
ADD COLUMN "sourceRepositoryName" TEXT,
ADD COLUMN "sourceRepositoryOwner" TEXT;

-- Backfill existing templates to preserve the historical assumption that
-- template repositories lived in the workspace Gitea organization.
UPDATE "CaseTemplate"
SET "repositoryOwner" = (
  SELECT "giteaOrganization"
  FROM "WorkspaceSettings"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "repositoryOwner" IS NULL;

ALTER TABLE "CaseTemplate"
ALTER COLUMN "repositoryOwner" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CaseTemplate_repositoryOwner_repositoryName_key"
ON "CaseTemplate"("repositoryOwner", "repositoryName");
