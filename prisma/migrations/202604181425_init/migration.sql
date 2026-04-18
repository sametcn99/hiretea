-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RECRUITER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "CandidateCaseStatus" AS ENUM ('DRAFT', 'PROVISIONING', 'READY', 'IN_PROGRESS', 'REVIEWING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CandidateCaseDecision" AS ENUM ('ADVANCE', 'HOLD', 'REJECT');

-- CreateEnum
CREATE TYPE "CandidateInviteIssueKind" AS ENUM ('INITIAL', 'RESEND');

-- CreateEnum
CREATE TYPE "RecruiterInviteIssueKind" AS ENUM ('INITIAL', 'RESEND');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiteaIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giteaUserId" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT,
    "initialPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiteaIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "manualInviteMode" BOOLEAN NOT NULL DEFAULT true,
    "giteaBaseUrl" TEXT NOT NULL,
    "giteaAdminBaseUrl" TEXT,
    "giteaOrganization" TEXT NOT NULL,
    "giteaAuthClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "repositoryDescription" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseTemplateReviewerAssignment" (
    "id" TEXT NOT NULL,
    "caseTemplateId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseTemplateReviewerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseTemplateReviewGuide" (
    "id" TEXT NOT NULL,
    "caseTemplateId" TEXT NOT NULL,
    "reviewerInstructions" TEXT,
    "decisionGuidance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseTemplateReviewGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseTemplateRubricCriterion" (
    "id" TEXT NOT NULL,
    "reviewGuideId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseTemplateRubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCase" (
    "id" TEXT NOT NULL,
    "caseTemplateId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "CandidateCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "decision" "CandidateCaseDecision",
    "workingRepository" TEXT,
    "branchName" TEXT,
    "workingRepositoryUrl" TEXT,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCaseReviewerAssignment" (
    "id" TEXT NOT NULL,
    "candidateCaseId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateCaseReviewerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAccessGrant" (
    "id" TEXT NOT NULL,
    "candidateCaseId" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "canOpenIssues" BOOLEAN NOT NULL DEFAULT false,
    "canOpenPullRequests" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CandidateAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateInvite" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdById" TEXT,
    "previousInviteId" TEXT,
    "issueKind" "CandidateInviteIssueKind" NOT NULL DEFAULT 'INITIAL',
    "resendSequence" INTEGER NOT NULL DEFAULT 1,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterInvite" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "createdById" TEXT,
    "previousInviteId" TEXT,
    "issueKind" "RecruiterInviteIssueKind" NOT NULL DEFAULT 'INITIAL',
    "resendSequence" INTEGER NOT NULL DEFAULT 1,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationNote" (
    "id" TEXT NOT NULL,
    "candidateCaseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "score" INTEGER,
    "summary" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "detail" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT,
    "eventName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GiteaIdentity_userId_key" ON "GiteaIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiteaIdentity_giteaUserId_key" ON "GiteaIdentity"("giteaUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GiteaIdentity_login_key" ON "GiteaIdentity"("login");

-- CreateIndex
CREATE UNIQUE INDEX "CaseTemplate_slug_key" ON "CaseTemplate"("slug");

-- CreateIndex
CREATE INDEX "CaseTemplateReviewerAssignment_reviewerId_createdAt_idx" ON "CaseTemplateReviewerAssignment"("reviewerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseTemplateReviewerAssignment_caseTemplateId_reviewerId_key" ON "CaseTemplateReviewerAssignment"("caseTemplateId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseTemplateReviewGuide_caseTemplateId_key" ON "CaseTemplateReviewGuide"("caseTemplateId");

-- CreateIndex
CREATE INDEX "CaseTemplateRubricCriterion_reviewGuideId_sortOrder_idx" ON "CaseTemplateRubricCriterion"("reviewGuideId", "sortOrder");

-- CreateIndex
CREATE INDEX "CandidateCaseReviewerAssignment_reviewerId_createdAt_idx" ON "CandidateCaseReviewerAssignment"("reviewerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateCaseReviewerAssignment_candidateCaseId_reviewerId_key" ON "CandidateCaseReviewerAssignment"("candidateCaseId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateInvite_tokenHash_key" ON "CandidateInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "CandidateInvite_candidateId_createdAt_idx" ON "CandidateInvite"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateInvite_candidateId_resendSequence_idx" ON "CandidateInvite"("candidateId", "resendSequence");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateInvite_candidateId_resendSequence_key" ON "CandidateInvite"("candidateId", "resendSequence");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterInvite_tokenHash_key" ON "RecruiterInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "RecruiterInvite_recruiterId_createdAt_idx" ON "RecruiterInvite"("recruiterId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruiterInvite_recruiterId_resendSequence_idx" ON "RecruiterInvite"("recruiterId", "resendSequence");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterInvite_recruiterId_resendSequence_key" ON "RecruiterInvite"("recruiterId", "resendSequence");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_deliveryId_key" ON "WebhookDelivery"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "GiteaIdentity" ADD CONSTRAINT "GiteaIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTemplate" ADD CONSTRAINT "CaseTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTemplateReviewerAssignment" ADD CONSTRAINT "CaseTemplateReviewerAssignment_caseTemplateId_fkey" FOREIGN KEY ("caseTemplateId") REFERENCES "CaseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTemplateReviewerAssignment" ADD CONSTRAINT "CaseTemplateReviewerAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTemplateReviewerAssignment" ADD CONSTRAINT "CaseTemplateReviewerAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTemplateReviewGuide" ADD CONSTRAINT "CaseTemplateReviewGuide_caseTemplateId_fkey" FOREIGN KEY ("caseTemplateId") REFERENCES "CaseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTemplateRubricCriterion" ADD CONSTRAINT "CaseTemplateRubricCriterion_reviewGuideId_fkey" FOREIGN KEY ("reviewGuideId") REFERENCES "CaseTemplateReviewGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCase" ADD CONSTRAINT "CandidateCase_caseTemplateId_fkey" FOREIGN KEY ("caseTemplateId") REFERENCES "CaseTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCase" ADD CONSTRAINT "CandidateCase_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCase" ADD CONSTRAINT "CandidateCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCaseReviewerAssignment" ADD CONSTRAINT "CandidateCaseReviewerAssignment_candidateCaseId_fkey" FOREIGN KEY ("candidateCaseId") REFERENCES "CandidateCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCaseReviewerAssignment" ADD CONSTRAINT "CandidateCaseReviewerAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCaseReviewerAssignment" ADD CONSTRAINT "CandidateCaseReviewerAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAccessGrant" ADD CONSTRAINT "CandidateAccessGrant_candidateCaseId_fkey" FOREIGN KEY ("candidateCaseId") REFERENCES "CandidateCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInvite" ADD CONSTRAINT "CandidateInvite_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInvite" ADD CONSTRAINT "CandidateInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInvite" ADD CONSTRAINT "CandidateInvite_previousInviteId_fkey" FOREIGN KEY ("previousInviteId") REFERENCES "CandidateInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterInvite" ADD CONSTRAINT "RecruiterInvite_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterInvite" ADD CONSTRAINT "RecruiterInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterInvite" ADD CONSTRAINT "RecruiterInvite_previousInviteId_fkey" FOREIGN KEY ("previousInviteId") REFERENCES "RecruiterInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationNote" ADD CONSTRAINT "EvaluationNote_candidateCaseId_fkey" FOREIGN KEY ("candidateCaseId") REFERENCES "CandidateCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationNote" ADD CONSTRAINT "EvaluationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
