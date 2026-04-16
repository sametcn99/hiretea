"use client";

import {
  Button,
  Callout,
  Flex,
  Link as RadixLink,
  Select,
  Text,
} from "@radix-ui/themes";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type CreateCandidateCaseActionState,
  createCandidateCaseAction,
} from "@/app/(app)/dashboard/candidate-cases/actions";
import type { CandidateCaseAssignmentOptions } from "@/lib/candidate-cases/queries";
import { ReviewerSelector } from "./reviewer-selector";

const initialCreateCandidateCaseState: CreateCandidateCaseActionState = {
  status: "idle",
};

type CandidateCaseCreateFormProps = {
  assignmentOptions: CandidateCaseAssignmentOptions;
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
      Assign case
    </Button>
  );
}

export function CandidateCaseCreateForm({
  assignmentOptions,
}: CandidateCaseCreateFormProps) {
  const [state, formAction] = useActionState(
    createCandidateCaseAction,
    initialCreateCandidateCaseState,
  );
  const [formKey, setFormKey] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);
  const hasRequiredOptions =
    assignmentOptions.candidates.length > 0 &&
    assignmentOptions.templates.length > 0 &&
    assignmentOptions.reviewers.length > 0;

  useEffect(() => {
    const selectedTemplate = assignmentOptions.templates.find(
      (template) => template.id === selectedTemplateId,
    );

    setSelectedReviewerIds(selectedTemplate?.defaultReviewerIds ?? []);
  }, [assignmentOptions.templates, selectedTemplateId]);

  useEffect(() => {
    if (state.status === "success") {
      setFormKey((k) => k + 1);
      setSelectedTemplateId("");
      setSelectedReviewerIds([]);
    }
  }, [state.status]);

  return (
    <form action={formAction} key={formKey}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium">
            Candidate
          </Text>
          <Select.Root name="candidateId">
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
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
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
          <Text size="1" color="gray">
            Template defaults are selected automatically. You can still add or
            remove reviewers here for this one candidate before assigning the
            case.
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="dueAt">
            Due date
          </Text>
          <input id="dueAt" name="dueAt" type="date" />
          {state.fieldErrors?.dueAt?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Callout.Root color="gray" size="1">
          <Callout.Text>
            The working repository is generated from the selected template
            inside{" "}
            {assignmentOptions.workspaceOrganization ??
              "the configured workspace organization"}
            . The candidate receives direct write access immediately after
            generation, and only the selected recruiter accounts are expected to
            review the submission.
          </Callout.Text>
        </Callout.Root>

        {!hasRequiredOptions ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>
              Candidate assignment requires at least one provisioned candidate
              with a linked Gitea login, one case template, and one active
              recruiter reviewer.
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
            {state.repositoryName ? (
              <Text size="1" color="gray" mt="1">
                Repository: {state.repositoryName}
              </Text>
            ) : null}
            {state.repositoryUrl ? (
              <RadixLink
                href={state.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                size="2"
                mt="1"
              >
                Open generated repository
              </RadixLink>
            ) : null}
          </Callout.Root>
        ) : null}

        <SubmitButton disabled={!hasRequiredOptions} />
      </Flex>
    </form>
  );
}
