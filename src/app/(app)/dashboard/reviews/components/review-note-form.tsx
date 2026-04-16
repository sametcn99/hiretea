"use client";

import {
  Button,
  Callout,
  Checkbox,
  Flex,
  Select,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type CreateEvaluationNoteActionState,
  createEvaluationNoteAction,
} from "@/app/(app)/dashboard/reviews/actions";
import type { ReviewCaseListItem } from "@/lib/evaluation-notes/queries";

const initialCreateEvaluationNoteState: CreateEvaluationNoteActionState = {
  status: "idle",
};

type ReviewNoteFormProps = {
  reviewCases?: ReviewCaseListItem[];
  fixedReviewCase?: ReviewCaseListItem;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      size="3"
      loading={pending}
      disabled={disabled || pending}
      type="submit"
      style={{ width: "100%" }}
    >
      Save review note
    </Button>
  );
}

export function ReviewNoteForm({
  reviewCases = [],
  fixedReviewCase,
}: ReviewNoteFormProps) {
  const [state, formAction] = useActionState(
    createEvaluationNoteAction,
    initialCreateEvaluationNoteState,
  );
  const [formKey, setFormKey] = useState(0);
  const hasReviewCases = fixedReviewCase ? true : reviewCases.length > 0;

  useEffect(() => {
    if (state.status === "success") {
      setFormKey((k) => k + 1);
    }
  }, [state.status]);

  return (
    <form action={formAction} key={formKey}>
      <Flex direction="column" gap="3">
        {fixedReviewCase ? (
          <>
            <input
              type="hidden"
              name="candidateCaseId"
              value={fixedReviewCase.id}
            />
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Reviewing now
              </Text>
              <Text weight="bold">
                {fixedReviewCase.candidateDisplayName} /{" "}
                {fixedReviewCase.templateName}
              </Text>
              <Text size="1" color="gray">
                Status:{" "}
                {fixedReviewCase.status.toLowerCase().replace(/_/g, " ")}
              </Text>
              <Text size="1" color="gray">
                {fixedReviewCase.assignedReviewerNames.length > 0
                  ? `Assigned reviewers: ${fixedReviewCase.assignedReviewerNames.join(", ")}`
                  : "Assigned reviewers: none"}
              </Text>
              <Text size="1" color="gray">
                {fixedReviewCase.hasTemplateReviewGuide
                  ? fixedReviewCase.rubricCriteriaCount > 0
                    ? `${fixedReviewCase.rubricCriteriaCount} rubric criteria ready`
                    : "Template review guide ready"
                  : "No template review guide yet"}
              </Text>
            </Flex>
          </>
        ) : (
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">
              Candidate case
            </Text>
            <Select.Root name="candidateCaseId">
              <Select.Trigger placeholder="Select a candidate case" />
              <Select.Content>
                {reviewCases.map((reviewCase) => (
                  <Select.Item key={reviewCase.id} value={reviewCase.id}>
                    {reviewCase.candidateDisplayName} /{" "}
                    {reviewCase.templateName} (
                    {reviewCase.status.toLowerCase().replace(/_/g, " ")})
                    {reviewCase.assignedReviewerNames.length > 0
                      ? ` • reviewers: ${reviewCase.assignedReviewerNames.join(", ")}`
                      : " • unassigned"}
                    {reviewCase.hasTemplateReviewGuide
                      ? ` • ${reviewCase.rubricCriteriaCount} criteria`
                      : " • no template rubric"}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            {state.fieldErrors?.candidateCaseId?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>
        )}

        <Flex direction="column" gap="1">
          <Callout.Root color="gray" size="1">
            <Callout.Text>
              Template-level review structures are now available as guidance.
              Scoring still remains freeform until rubric-driven note capture is
              wired in.
            </Callout.Text>
          </Callout.Root>
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="score">
            Score (1-10)
          </Text>
          <TextField.Root
            id="score"
            name="score"
            defaultValue="7"
            type="number"
            min={1}
            max={10}
            step={1}
            color={state.fieldErrors?.score ? "red" : undefined}
          />
          {state.fieldErrors?.score?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="summary">
            Summary
          </Text>
          <TextArea
            id="summary"
            name="summary"
            placeholder="Short verdict on the implementation quality, delivery, and correctness."
            rows={3}
            color={state.fieldErrors?.summary ? "red" : undefined}
          />
          {state.fieldErrors?.summary?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="note">
            Detailed note
          </Text>
          <TextArea
            id="note"
            name="note"
            placeholder="Capture concrete observations, follow-up questions, and strengths or risks."
            rows={6}
          />
          {state.fieldErrors?.note?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium">
            Decision
          </Text>
          <Select.Root name="decision">
            <Select.Trigger placeholder="No final decision yet" />
            <Select.Content>
              <Select.Item value="ADVANCE">Advance</Select.Item>
              <Select.Item value="HOLD">Hold</Select.Item>
              <Select.Item value="REJECT">Reject</Select.Item>
            </Select.Content>
          </Select.Root>
          {state.fieldErrors?.decision?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex gap="3" align="start">
          <Checkbox name="finalizeReview" id="finalizeReview" />
          <Flex direction="column" gap="1">
            <Text as="label" htmlFor="finalizeReview" size="2" weight="bold">
              Mark this review as complete
            </Text>
            <Text size="1" color="gray">
              Completing the review moves the case to completed status and
              requires a final decision.
            </Text>
          </Flex>
        </Flex>

        {!hasReviewCases ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>
              Reviewer notes require at least one assigned candidate case.
            </Callout.Text>
          </Callout.Root>
        ) : null}

        {state.status === "error" && state.message ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        {state.status === "success" && state.message ? (
          <Callout.Root color="green" size="1">
            <Callout.Text>{state.message}</Callout.Text>
            {typeof state.latestScore === "number" ? (
              <Text size="1" color="gray" mt="1">
                Latest score: {state.latestScore}/10
              </Text>
            ) : null}
          </Callout.Root>
        ) : null}

        <SubmitButton disabled={!hasReviewCases} />
      </Flex>
    </form>
  );
}
