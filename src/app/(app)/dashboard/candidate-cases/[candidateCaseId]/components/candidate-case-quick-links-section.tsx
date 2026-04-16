import { FileTextIcon } from "@radix-ui/react-icons";
import { Button, Flex } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import type { CandidateCaseDetail } from "@/lib/candidate-cases/queries";

type CandidateCaseQuickLinksSectionProps = {
  candidateCase: CandidateCaseDetail;
  canOpenReviewWorkflow: boolean;
};

export function CandidateCaseQuickLinksSection({
  candidateCase,
  canOpenReviewWorkflow,
}: CandidateCaseQuickLinksSectionProps) {
  return (
    <SectionCard
      title="Quick links"
      description="Jump straight into the operational surfaces tied to this candidate case."
      eyebrow="Navigation"
    >
      <Flex direction="column" gap="2">
        <Button asChild variant="soft" size="2">
          <Link href={"/dashboard/candidate-cases" as Route}>
            All candidate cases
          </Link>
        </Button>
        {canOpenReviewWorkflow ? (
          <Button asChild variant="soft" size="2">
            <Link href={`/dashboard/reviews/${candidateCase.id}` as Route}>
              Review workflow
            </Link>
          </Button>
        ) : null}
        {candidateCase.workingRepositoryUrl ? (
          <Button asChild variant="soft" size="2">
            <a
              href={candidateCase.workingRepositoryUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FileTextIcon />
              Repository in Gitea
            </a>
          </Button>
        ) : null}
      </Flex>
    </SectionCard>
  );
}
