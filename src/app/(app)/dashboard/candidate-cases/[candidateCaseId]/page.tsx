import { UserRole } from "@prisma/client";
import { Flex, Grid } from "@radix-ui/themes";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  getCandidateCaseAssignmentOptions,
  getCandidateCaseById,
  listCandidateCases,
} from "@/lib/candidate-cases/queries";
import { CandidateCaseAuditTrailSection } from "./components/candidate-case-audit-trail-section";
import { CandidateCaseContextSection } from "./components/candidate-case-context-section";
import {
  canOpenCandidateCaseReviewWorkflow,
  getCandidateCaseNavigation,
} from "./components/candidate-case-detail-helpers";
import { CandidateCaseQuickLinksSection } from "./components/candidate-case-quick-links-section";
import { CandidateCaseRepositoryActivitySection } from "./components/candidate-case-repository-activity-section";
import { CandidateCaseReviewHistorySection } from "./components/candidate-case-review-history-section";
import { CandidateCaseTemplateGuideSection } from "./components/candidate-case-template-guide-section";
import { CandidateCaseWorkspaceSection } from "./components/candidate-case-workspace-section";

type CandidateCaseDetailPageProps = {
  params: Promise<{
    candidateCaseId: string;
  }>;
};

export default async function CandidateCaseDetailPage({
  params,
}: CandidateCaseDetailPageProps) {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const { candidateCaseId } = await params;

  const [candidateCase, candidateCases, assignmentOptions] = await Promise.all([
    getCandidateCaseById(candidateCaseId),
    listCandidateCases({ includeArchived: true }),
    getCandidateCaseAssignmentOptions(),
  ]);

  if (!candidateCase) {
    notFound();
  }

  const navigation = getCandidateCaseNavigation(
    candidateCase.id,
    candidateCases,
  );
  const canOpenReviewWorkflow =
    canOpenCandidateCaseReviewWorkflow(candidateCase);

  return (
    <Grid
      columns={{ initial: "1fr", xl: "minmax(0, 1fr) 360px" }}
      gap="4"
      align="start"
    >
      <Flex direction="column" gap="4">
        <CandidateCaseWorkspaceSection
          candidateCase={candidateCase}
          assignmentOptions={assignmentOptions}
          navigation={navigation}
          canOpenReviewWorkflow={canOpenReviewWorkflow}
        />
        <CandidateCaseRepositoryActivitySection candidateCase={candidateCase} />
        <CandidateCaseReviewHistorySection candidateCase={candidateCase} />
        <CandidateCaseAuditTrailSection candidateCase={candidateCase} />
      </Flex>

      <Flex direction="column" gap="4">
        <CandidateCaseContextSection candidateCase={candidateCase} />
        <CandidateCaseTemplateGuideSection candidateCase={candidateCase} />
        <CandidateCaseQuickLinksSection
          candidateCase={candidateCase}
          canOpenReviewWorkflow={canOpenReviewWorkflow}
        />
      </Flex>
    </Grid>
  );
}
