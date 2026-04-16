import { ArrowLeftIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { CandidateCaseActions } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-actions";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CandidateCaseAssignmentOptions,
  CandidateCaseDetail,
} from "@/lib/candidate-cases/queries";
import {
  type CandidateCaseNavigation,
  candidateCaseDecisionToneMap,
  candidateCaseStatusToneMap,
} from "./candidate-case-detail-helpers";

type CandidateCaseWorkspaceSectionProps = {
  candidateCase: CandidateCaseDetail;
  assignmentOptions: CandidateCaseAssignmentOptions;
  navigation: CandidateCaseNavigation;
  canOpenReviewWorkflow: boolean;
};

export function CandidateCaseWorkspaceSection({
  candidateCase,
  assignmentOptions,
  navigation,
  canOpenReviewWorkflow,
}: CandidateCaseWorkspaceSectionProps) {
  return (
    <SectionCard
      title="Candidate case workspace"
      description="Track operational state, repository signals, reviewer ownership, and the full assignment history for this case."
      eyebrow="Case detail"
    >
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex gap="2" wrap="wrap">
            <Button asChild variant="soft" color="gray" size="2">
              <Link href={"/dashboard/candidate-cases" as Route}>
                <ArrowLeftIcon />
                Back to cases
              </Link>
            </Button>
            {navigation.previousCandidateCase ? (
              <Button asChild variant="soft" size="2">
                <Link
                  href={
                    `/dashboard/candidate-cases/${navigation.previousCandidateCase.id}` as Route
                  }
                >
                  Previous case
                </Link>
              </Button>
            ) : (
              <Button variant="soft" size="2" disabled>
                Previous case
              </Button>
            )}
            {navigation.nextCandidateCase ? (
              <Button asChild variant="soft" size="2">
                <Link
                  href={
                    `/dashboard/candidate-cases/${navigation.nextCandidateCase.id}` as Route
                  }
                >
                  Next case
                </Link>
              </Button>
            ) : (
              <Button variant="soft" size="2" disabled>
                Next case
              </Button>
            )}
          </Flex>

          <Flex gap="2" wrap="wrap" align="center" justify="end">
            {navigation.currentPosition ? (
              <Text size="1" color="gray">
                Case {navigation.currentPosition} of {navigation.totalCount}
              </Text>
            ) : null}
            <StatusBadge
              label={candidateCase.status.toLowerCase().replace(/_/g, " ")}
              tone={candidateCaseStatusToneMap[candidateCase.status]}
            />
            {candidateCase.decision ? (
              <StatusBadge
                label={candidateCase.decision.toLowerCase()}
                tone={candidateCaseDecisionToneMap[candidateCase.decision]}
              />
            ) : null}
          </Flex>
        </Flex>

        <Flex
          justify="between"
          align={{ initial: "start", md: "center" }}
          gap="3"
          wrap="wrap"
        >
          <Flex direction="column" gap="1">
            <Text weight="bold" size="4">
              {candidateCase.candidateDisplayName}
            </Text>
            <Text size="2" color="gray">
              {candidateCase.templateName} · {candidateCase.templateSlug}
            </Text>
            <Text size="1" color="gray">
              {candidateCase.candidateEmail}
            </Text>
            <Text size="1" color="gray">
              Candidate login: {candidateCase.candidateLogin ?? "Not linked"}
            </Text>
          </Flex>

          <Flex gap="2" wrap="wrap" justify="end">
            {canOpenReviewWorkflow ? (
              <Button asChild variant="soft" size="2">
                <Link href={`/dashboard/reviews/${candidateCase.id}` as Route}>
                  Open review workflow
                </Link>
              </Button>
            ) : null}
            {candidateCase.workingRepositoryUrl ? (
              <Button asChild size="2">
                <a
                  href={candidateCase.workingRepositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open repository
                  <ExternalLinkIcon />
                </a>
              </Button>
            ) : null}
            <CandidateCaseActions
              candidateCase={candidateCase}
              assignmentOptions={assignmentOptions}
            />
          </Flex>
        </Flex>

        <Text size="2" color="gray">
          {candidateCase.templateSummary}
        </Text>
      </Flex>
    </SectionCard>
  );
}
