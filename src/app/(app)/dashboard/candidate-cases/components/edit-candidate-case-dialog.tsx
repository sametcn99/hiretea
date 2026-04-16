"use client";

import { Button, Callout, Dialog, Flex, Select, Text } from "@radix-ui/themes";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type UpdateCandidateCaseActionState,
  updateCandidateCaseAction,
} from "@/app/(app)/dashboard/candidate-cases/actions";
import type {
  CandidateCaseAssignmentOptions,
  CandidateCaseListItem,
} from "@/lib/candidate-cases/queries";
import { ReviewerSelector } from "./reviewer-selector";

type EditCandidateCaseDialogProps = {
  candidateCase: CandidateCaseListItem;
  assignmentOptions: CandidateCaseAssignmentOptions;
};

const initialState: UpdateCandidateCaseActionState = {
  status: "idle",
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="3"
      loading={pending}
      disabled={disabled || pending}
    >
      Save changes
    </Button>
  );
}

export function EditCandidateCaseDialog({
  candidateCase,
  assignmentOptions,
}: EditCandidateCaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>(
    candidateCase.reviewerIds,
  );
  const boundAction = useMemo(
    () => updateCandidateCaseAction.bind(null, candidateCase.id),
    [candidateCase.id],
  );
  const [state, formAction] = useActionState(boundAction, initialState);
  const hasRequiredOptions =
    assignmentOptions.candidates.length > 0 &&
    assignmentOptions.templates.length > 0 &&
    assignmentOptions.reviewers.length > 0;

  useEffect(() => {
    if (open) {
      setSelectedReviewerIds(candidateCase.reviewerIds);
    }
  }, [candidateCase.reviewerIds, open]);

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
    }
  }, [state.status]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="soft" color="gray" size="1">
          Edit details
        </Button>
      </Dialog.Trigger>
      <Dialog.Content size="4" maxWidth="560px">
        <Dialog.Title>Edit candidate case</Dialog.Title>
        <Dialog.Description size="2">
          Update the assigned candidate, template reference, due date, and
          reviewer roster for this case.
        </Dialog.Description>

        <form action={formAction}>
          <Flex direction="column" gap="3" mt="4">
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium">
                Candidate
              </Text>
              <Select.Root
                name="candidateId"
                defaultValue={candidateCase.candidateId}
              >
                <Select.Trigger placeholder="Select a candidate" />
                <Select.Content>
                  {assignmentOptions.candidates.map((candidate) => (
                    <Select.Item key={candidate.id} value={candidate.id}>
                      {candidate.displayName} ({candidate.giteaLogin})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              {state.fieldErrors?.candidateId?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium">
                Case template
              </Text>
              <Select.Root
                name="caseTemplateId"
                defaultValue={candidateCase.caseTemplateId}
              >
                <Select.Trigger placeholder="Select a template" />
                <Select.Content>
                  {assignmentOptions.templates.map((template) => (
                    <Select.Item key={template.id} value={template.id}>
                      {template.name} ({template.slug})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              {state.fieldErrors?.caseTemplateId?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Reviewers
              </Text>
              <ReviewerSelector
                reviewers={assignmentOptions.reviewers}
                selectedReviewerIds={selectedReviewerIds}
                onSelectedReviewerIdsChange={setSelectedReviewerIds}
                errorMessages={state.fieldErrors?.reviewerIds}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor={`dueAt-${candidateCase.id}`}
              >
                Due date
              </Text>
              <input
                id={`dueAt-${candidateCase.id}`}
                name="dueAt"
                type="date"
                defaultValue={
                  candidateCase.dueAt?.toISOString().slice(0, 10) ?? ""
                }
              />
              {state.fieldErrors?.dueAt?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Callout.Root color="gray" size="1">
              <Callout.Text>
                Changing the template updates the case record and review
                context. The already generated repository is preserved as-is.
              </Callout.Text>
            </Callout.Root>

            {!hasRequiredOptions ? (
              <Callout.Root color="red" size="1">
                <Callout.Text>
                  Editing requires at least one active candidate, template, and
                  reviewer option.
                </Callout.Text>
              </Callout.Root>
            ) : null}

            {state.status === "error" && state.message ? (
              <Callout.Root color="red" size="1">
                <Callout.Text>{state.message}</Callout.Text>
              </Callout.Root>
            ) : null}

            <Flex justify="end" gap="2" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <SubmitButton disabled={!hasRequiredOptions} />
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
