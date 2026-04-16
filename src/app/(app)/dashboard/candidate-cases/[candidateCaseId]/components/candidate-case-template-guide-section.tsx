import { Box, Callout, Flex, Text } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import type { CandidateCaseDetail } from "@/lib/candidate-cases/queries";

type CandidateCaseTemplateGuideSectionProps = {
  candidateCase: CandidateCaseDetail;
};

export function CandidateCaseTemplateGuideSection({
  candidateCase,
}: CandidateCaseTemplateGuideSectionProps) {
  return (
    <SectionCard
      title="Template guide"
      description="The review guidance and rubric defaults inherited from the selected case template."
      eyebrow="Reference"
    >
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Template repository
          </Text>
          <Text size="1" color="gray">
            {candidateCase.templateRepositoryName}
          </Text>
          <Text size="1" color="gray">
            Default branch: {candidateCase.templateDefaultBranch}
          </Text>
          <Text size="1" color="gray">
            {candidateCase.templateRepositoryDescription ??
              "No repository description provided."}
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Reviewer instructions
          </Text>
          <Text size="1" color="gray">
            {candidateCase.templateReviewerInstructions ??
              "No reviewer instructions configured."}
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Decision guidance
          </Text>
          <Text size="1" color="gray">
            {candidateCase.templateDecisionGuidance ??
              "No decision guidance configured."}
          </Text>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Rubric criteria
          </Text>
          {candidateCase.rubricCriteria.length === 0 ? (
            <Text size="1" color="gray">
              No rubric criteria configured for this template.
            </Text>
          ) : (
            candidateCase.rubricCriteria.map((criterion) => (
              <Box
                key={criterion.id}
                style={{
                  border: "1px solid var(--gray-a5)",
                  borderRadius: "var(--radius-2)",
                  padding: "0.75rem",
                }}
              >
                <Flex direction="column" gap="1">
                  <Flex justify="between" gap="2" wrap="wrap">
                    <Text size="2" weight="medium">
                      {criterion.title}
                    </Text>
                    <Text size="1" color="gray">
                      Weight {criterion.weight ?? "N/A"}
                    </Text>
                  </Flex>
                  <Text size="1" color="gray">
                    {criterion.description ??
                      "No criterion description provided."}
                  </Text>
                </Flex>
              </Box>
            ))
          )}
        </Flex>

        {candidateCase.latestSummary ? (
          <Callout.Root color="gray" size="1">
            <Callout.Text>
              Latest review summary: {candidateCase.latestSummary}
            </Callout.Text>
          </Callout.Root>
        ) : null}
      </Flex>
    </SectionCard>
  );
}
