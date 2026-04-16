"use client";

import {
  Button,
  Callout,
  Dialog,
  Flex,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ReviewerSelector } from "@/app/(app)/dashboard/candidate-cases/components/reviewer-selector";
import {
  type UpdateCaseTemplateActionState,
  updateCaseTemplateAction,
} from "@/app/(app)/dashboard/case-templates/actions";
import {
  buildRepositoryName,
  buildTemplateSlug,
} from "@/app/(app)/dashboard/case-templates/components/case-template-form-helpers";
import { useToast } from "@/components/providers/toast-provider";
import type {
  CaseTemplateListItem,
  CaseTemplateReviewerOption,
} from "@/lib/case-templates/queries";

type EditCaseTemplateDialogProps = {
  reviewerOptions: CaseTemplateReviewerOption[];
  template: CaseTemplateListItem;
};

const initialState: UpdateCaseTemplateActionState = {
  status: "idle",
};

function buildInitialFormValues(template: CaseTemplateListItem) {
  return {
    name: template.name,
    slug: template.slug,
    summary: template.summary,
    repositoryName: template.repositoryName,
    repositoryDescription: template.repositoryDescription ?? "",
    defaultBranch: template.defaultBranch,
    reviewerInstructions: template.reviewerInstructions ?? "",
    decisionGuidance: template.decisionGuidance ?? "",
    rubricCriteria: template.rubricCriteriaInput,
  };
}

function areReviewerSelectionsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.every(
    (reviewerId, index) => reviewerId === rightSorted[index],
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="3" loading={pending} disabled={pending}>
      Save changes
    </Button>
  );
}

export function EditCaseTemplateDialog({
  reviewerOptions,
  template,
}: EditCaseTemplateDialogProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const initialFormValues = useMemo(
    () => buildInitialFormValues(template),
    [template],
  );
  const [formValues, setFormValues] = useState(initialFormValues);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>(
    template.defaultReviewerIds,
  );
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(false);
  const [hasManualRepositoryNameOverride, setHasManualRepositoryNameOverride] =
    useState(false);
  const allowImmediateCloseRef = useRef(false);
  const boundAction = useMemo(
    () => updateCaseTemplateAction.bind(null, template.id),
    [template.id],
  );
  const [state, formAction] = useActionState(boundAction, initialState);

  const hasUnsavedChanges =
    formValues.name !== initialFormValues.name ||
    formValues.slug !== initialFormValues.slug ||
    formValues.summary !== initialFormValues.summary ||
    formValues.repositoryName !== initialFormValues.repositoryName ||
    formValues.repositoryDescription !==
      initialFormValues.repositoryDescription ||
    formValues.defaultBranch !== initialFormValues.defaultBranch ||
    formValues.reviewerInstructions !==
      initialFormValues.reviewerInstructions ||
    formValues.decisionGuidance !== initialFormValues.decisionGuidance ||
    formValues.rubricCriteria !== initialFormValues.rubricCriteria ||
    !areReviewerSelectionsEqual(
      selectedReviewerIds,
      template.defaultReviewerIds,
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormValues(initialFormValues);
    setSelectedReviewerIds(template.defaultReviewerIds);
    setHasManualSlugOverride(false);
    setHasManualRepositoryNameOverride(false);
  }, [initialFormValues, open, template.defaultReviewerIds]);

  useEffect(() => {
    if (state.status === "success") {
      showToast({
        tone: "success",
        title: "Template updated",
        description: `${template.name} was saved successfully.`,
      });
      allowImmediateCloseRef.current = true;
      setOpen(false);
    }
  }, [showToast, state.status, template.name]);

  useEffect(() => {
    if (open && hasUnsavedChanges) {
      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [hasUnsavedChanges, open]);

  useEffect(() => {
    if (!open) {
      allowImmediateCloseRef.current = false;
    }
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (allowImmediateCloseRef.current) {
      setOpen(false);
      return;
    }

    if (
      hasUnsavedChanges &&
      !window.confirm(
        "You have unsaved template changes. Close this dialog and discard them?",
      )
    ) {
      return;
    }

    setOpen(false);
  }

  function handleNameChange(nextName: string) {
    setFormValues((current) => {
      const previousSlugSuggestion = buildTemplateSlug(current.name);
      const previousRepositorySuggestion = buildRepositoryName(current.name);
      const nextSlugSuggestion = buildTemplateSlug(nextName);
      const nextRepositorySuggestion = buildRepositoryName(nextName);

      return {
        ...current,
        name: nextName,
        slug:
          !hasManualSlugOverride || current.slug === previousSlugSuggestion
            ? nextSlugSuggestion
            : current.slug,
        repositoryName:
          !hasManualRepositoryNameOverride ||
          current.repositoryName === previousRepositorySuggestion
            ? nextRepositorySuggestion
            : current.repositoryName,
      };
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button variant="soft" color="gray" size="1">
          Edit template
        </Button>
      </Dialog.Trigger>
      <Dialog.Content size="4" maxWidth="680px">
        <Dialog.Title>Edit case template</Dialog.Title>
        <Dialog.Description size="2">
          Update template metadata, repository settings, and default review
          guidance.
        </Dialog.Description>

        <form action={formAction}>
          <Flex direction="column" gap="3" mt="4">
            <Text size="1" color="gray">
              Template name keeps slug and repository name in sync until you
              edit those fields manually.
            </Text>

            <Flex direction={{ initial: "column", md: "row" }} gap="3">
              <Flex direction="column" gap="1" flexGrow="1">
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  htmlFor={`template-name-${template.id}`}
                >
                  Template name
                </Text>
                <TextField.Root
                  id={`template-name-${template.id}`}
                  name="name"
                  value={formValues.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  color={state.fieldErrors?.name ? "red" : undefined}
                />
                {state.fieldErrors?.name?.map((error) => (
                  <Text size="1" color="red" key={error}>
                    {error}
                  </Text>
                ))}
              </Flex>

              <Flex direction="column" gap="1" flexGrow="1">
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  htmlFor={`template-slug-${template.id}`}
                >
                  Template slug
                </Text>
                <TextField.Root
                  id={`template-slug-${template.id}`}
                  name="slug"
                  value={formValues.slug}
                  onChange={(event) => {
                    setHasManualSlugOverride(true);
                    setFormValues((current) => ({
                      ...current,
                      slug: event.target.value,
                    }));
                  }}
                  color={state.fieldErrors?.slug ? "red" : undefined}
                />
                {state.fieldErrors?.slug?.map((error) => (
                  <Text size="1" color="red" key={error}>
                    {error}
                  </Text>
                ))}
              </Flex>
            </Flex>

            <Flex direction={{ initial: "column", md: "row" }} gap="3">
              <Flex direction="column" gap="1" flexGrow="1">
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  htmlFor={`repository-name-${template.id}`}
                >
                  Repository name
                </Text>
                <TextField.Root
                  id={`repository-name-${template.id}`}
                  name="repositoryName"
                  value={formValues.repositoryName}
                  onChange={(event) => {
                    setHasManualRepositoryNameOverride(true);
                    setFormValues((current) => ({
                      ...current,
                      repositoryName: event.target.value,
                    }));
                  }}
                  color={state.fieldErrors?.repositoryName ? "red" : undefined}
                />
                {state.fieldErrors?.repositoryName?.map((error) => (
                  <Text size="1" color="red" key={error}>
                    {error}
                  </Text>
                ))}
              </Flex>

              <Flex direction="column" gap="1" flexGrow="1">
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  htmlFor={`default-branch-${template.id}`}
                >
                  Default branch
                </Text>
                <TextField.Root
                  id={`default-branch-${template.id}`}
                  name="defaultBranch"
                  value={formValues.defaultBranch}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      defaultBranch: event.target.value,
                    }))
                  }
                  color={state.fieldErrors?.defaultBranch ? "red" : undefined}
                />
                {state.fieldErrors?.defaultBranch?.map((error) => (
                  <Text size="1" color="red" key={error}>
                    {error}
                  </Text>
                ))}
              </Flex>
            </Flex>

            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor={`template-summary-${template.id}`}
              >
                Summary
              </Text>
              <TextArea
                id={`template-summary-${template.id}`}
                name="summary"
                rows={4}
                value={formValues.summary}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                color={state.fieldErrors?.summary ? "red" : undefined}
              />
              {state.fieldErrors?.summary?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor={`template-repository-description-${template.id}`}
              >
                Repository description
              </Text>
              <TextArea
                id={`template-repository-description-${template.id}`}
                name="repositoryDescription"
                rows={3}
                value={formValues.repositoryDescription}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    repositoryDescription: event.target.value,
                  }))
                }
                color={
                  state.fieldErrors?.repositoryDescription ? "red" : undefined
                }
              />
              {state.fieldErrors?.repositoryDescription?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Default reviewers
              </Text>
              <ReviewerSelector
                reviewers={reviewerOptions}
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
                htmlFor={`template-reviewer-instructions-${template.id}`}
              >
                Reviewer instructions
              </Text>
              <TextArea
                id={`template-reviewer-instructions-${template.id}`}
                name="reviewerInstructions"
                rows={4}
                value={formValues.reviewerInstructions}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    reviewerInstructions: event.target.value,
                  }))
                }
                color={
                  state.fieldErrors?.reviewerInstructions ? "red" : undefined
                }
              />
              {state.fieldErrors?.reviewerInstructions?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor={`template-decision-guidance-${template.id}`}
              >
                Decision guidance
              </Text>
              <TextArea
                id={`template-decision-guidance-${template.id}`}
                name="decisionGuidance"
                rows={3}
                value={formValues.decisionGuidance}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    decisionGuidance: event.target.value,
                  }))
                }
                color={state.fieldErrors?.decisionGuidance ? "red" : undefined}
              />
              {state.fieldErrors?.decisionGuidance?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor={`template-rubric-criteria-${template.id}`}
              >
                Rubric criteria
              </Text>
              <TextArea
                id={`template-rubric-criteria-${template.id}`}
                name="rubricCriteria"
                rows={6}
                value={formValues.rubricCriteria}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    rubricCriteria: event.target.value,
                  }))
                }
                color={state.fieldErrors?.rubricCriteria ? "red" : undefined}
              />
              {state.fieldErrors?.rubricCriteria?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Callout.Root color="gray" size="1">
              <Callout.Text>
                Updating the repository name renames the linked Gitea repository
                too. Manual slug and repository edits stay respected after you
                diverge from the template name.
              </Callout.Text>
            </Callout.Root>

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
              <SubmitButton />
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
