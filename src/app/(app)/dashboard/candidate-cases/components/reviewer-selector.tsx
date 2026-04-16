"use client";

import { Flex, Text } from "@radix-ui/themes";
import type { CandidateCaseAssignmentReviewerOption } from "@/lib/candidate-cases/queries";

type ReviewerSelectorProps = {
  reviewers: CandidateCaseAssignmentReviewerOption[];
  selectedReviewerIds: string[];
  onSelectedReviewerIdsChange: (nextValue: string[]) => void;
  errorMessages?: string[];
};

export function ReviewerSelector({
  reviewers,
  selectedReviewerIds,
  onSelectedReviewerIdsChange,
  errorMessages,
}: ReviewerSelectorProps) {
  const reviewerIds = reviewers.map((reviewer) => reviewer.id);
  const allSelected =
    reviewerIds.length > 0 &&
    reviewerIds.every((id) => selectedReviewerIds.includes(id));

  function handleToggleAll(checked: boolean) {
    onSelectedReviewerIdsChange(checked ? reviewerIds : []);
  }

  function handleToggleReviewer(reviewerId: string, checked: boolean) {
    if (checked) {
      onSelectedReviewerIdsChange([
        ...new Set([...selectedReviewerIds, reviewerId]),
      ]);
      return;
    }

    onSelectedReviewerIdsChange(
      selectedReviewerIds.filter(
        (selectedReviewerId) => selectedReviewerId !== reviewerId,
      ),
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Flex direction="column" gap="1">
        <label>
          <Flex gap="2" align="start">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) => handleToggleAll(event.target.checked)}
            />
            <Flex direction="column" gap="1">
              <Text size="2" weight="bold">
                Assign all reviewers
              </Text>
              <Text size="1" color="gray">
                Toggle every active recruiter in one step.
              </Text>
            </Flex>
          </Flex>
        </label>
      </Flex>

      <Flex direction="column" gap="2">
        {reviewers.map((reviewer) => {
          const checked = selectedReviewerIds.includes(reviewer.id);

          return (
            <label key={reviewer.id}>
              <Flex gap="2" align="start">
                <input
                  type="checkbox"
                  name="reviewerIds"
                  value={reviewer.id}
                  checked={checked}
                  onChange={(event) =>
                    handleToggleReviewer(reviewer.id, event.target.checked)
                  }
                />
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">
                    {reviewer.displayName}
                  </Text>
                  <Text size="1" color="gray">
                    {reviewer.email}
                  </Text>
                </Flex>
              </Flex>
            </label>
          );
        })}
      </Flex>

      {errorMessages?.map((error) => (
        <Text size="1" color="red" key={error}>
          {error}
        </Text>
      ))}
    </Flex>
  );
}
