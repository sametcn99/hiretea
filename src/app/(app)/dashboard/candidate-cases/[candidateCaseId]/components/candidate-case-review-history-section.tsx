import { Flex, Separator, Text } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import type { CandidateCaseDetail } from "@/lib/candidate-cases/queries";
import { formatCandidateCaseDate } from "./candidate-case-detail-helpers";

type CandidateCaseReviewHistorySectionProps = {
  candidateCase: CandidateCaseDetail;
};

export function CandidateCaseReviewHistorySection({
  candidateCase,
}: CandidateCaseReviewHistorySectionProps) {
  return (
    <SectionCard
      title="Review history"
      description="All reviewer notes, summaries, and scoring captured against this case so far."
      eyebrow="Evaluation"
    >
      {candidateCase.reviewHistory.length === 0 ? (
        <Text as="p" size="2" color="gray">
          No review notes have been recorded for this case yet.
        </Text>
      ) : (
        <Flex direction="column" gap="3">
          {candidateCase.reviewHistory.map((historyItem, index) => (
            <Flex direction="column" gap="2" key={historyItem.id}>
              {index > 0 ? <Separator size="4" /> : null}
              <Flex
                justify="between"
                align={{ initial: "start", sm: "center" }}
                gap="3"
                wrap="wrap"
              >
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">
                    {historyItem.authorName}
                  </Text>
                  <Text size="1" color="gray">
                    Created: {formatCandidateCaseDate(historyItem.createdAt)}
                  </Text>
                  <Text size="1" color="gray">
                    Updated: {formatCandidateCaseDate(historyItem.updatedAt)}
                  </Text>
                </Flex>
                <Text size="2" weight="medium">
                  {typeof historyItem.score === "number"
                    ? `Score ${historyItem.score}/10`
                    : "No score"}
                </Text>
              </Flex>
              <Text size="2" weight="medium">
                {historyItem.summary}
              </Text>
              <Text size="1" color="gray">
                {historyItem.note ?? "No detailed note provided."}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </SectionCard>
  );
}
