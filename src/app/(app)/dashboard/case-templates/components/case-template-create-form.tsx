"use client";

import {
  Button,
  Callout,
  Flex,
  Grid,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ReviewerSelector } from "@/app/(app)/dashboard/candidate-cases/components/reviewer-selector";
import {
  type CreateCaseTemplateActionState,
  createCaseTemplateAction,
} from "@/app/(app)/dashboard/case-templates/actions";
import {
  buildRepositoryName,
  buildTemplateSlug,
} from "@/app/(app)/dashboard/case-templates/components/case-template-form-helpers";
import type { CaseTemplateReviewerOption } from "@/lib/case-templates/queries";

const initialCreateCaseTemplateState: CreateCaseTemplateActionState = {
  status: "idle",
};

const initialFormValues = {
  name: "",
  slug: "",
  summary: "",
  repositoryName: "",
  repositoryDescription: "",
  defaultBranch: "main",
  reviewerInstructions: "",
  decisionGuidance: "",
  rubricCriteria: "",
};

type CaseTemplateCreateFormProps = {
  reviewerOptions: CaseTemplateReviewerOption[];
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      size="3"
      loading={pending}
      disabled={pending}
      type="submit"
      style={{ width: "100%" }}
    >
      Create template
    </Button>
  );
}

export function CaseTemplateCreateForm({
  reviewerOptions,
}: CaseTemplateCreateFormProps) {
  const [state, formAction] = useActionState(
    createCaseTemplateAction,
    initialCreateCaseTemplateState,
  );
  const [formValues, setFormValues] = useState(initialFormValues);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(false);
  const [hasManualRepositoryNameOverride, setHasManualRepositoryNameOverride] =
    useState(false);

  useEffect(() => {
    if (state.status === "success") {
      setFormValues(initialFormValues);
      setSelectedReviewerIds([]);
      setHasManualSlugOverride(false);
      setHasManualRepositoryNameOverride(false);
    }
  }, [state.status]);

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
    <form action={formAction}>
      <Flex direction="column" gap="4">
        <Text size="1" color="gray">
          Fields marked with{" "}
          <Text as="span" color="red">
            *
          </Text>{" "}
          are required.
        </Text>

        <Grid
          columns={{ initial: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
          gap="3"
        >
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="name">
              Template name{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <TextField.Root
              id="name"
              name="name"
              placeholder="Backend API challenge"
              type="text"
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

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="slug">
              Template slug{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <TextField.Root
              id="slug"
              name="slug"
              placeholder="backend-api-challenge"
              type="text"
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

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="repositoryName">
              Repository name{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <TextField.Root
              id="repositoryName"
              name="repositoryName"
              placeholder="backend-api-challenge"
              type="text"
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

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="defaultBranch">
              Default branch{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <TextField.Root
              id="defaultBranch"
              name="defaultBranch"
              placeholder="main"
              type="text"
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
        </Grid>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="summary">
            Summary{" "}
            <Text as="span" color="red">
              *
            </Text>
          </Text>
          <TextArea
            id="summary"
            name="summary"
            placeholder="A concise description of the challenge, expected output, and review focus."
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
            htmlFor="repositoryDescription"
          >
            Repository description
          </Text>
          <TextArea
            id="repositoryDescription"
            name="repositoryDescription"
            placeholder="Optional short description that will be stored in Gitea."
            rows={3}
            value={formValues.repositoryDescription}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                repositoryDescription: event.target.value,
              }))
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
          <Text size="1" color="gray">
            These reviewers are selected by default when this template is
            assigned to a candidate. You can still add or remove reviewers for a
            specific case before saving it.
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text
            as="label"
            size="2"
            weight="medium"
            htmlFor="reviewerInstructions"
          >
            Reviewer instructions
          </Text>
          <TextArea
            id="reviewerInstructions"
            name="reviewerInstructions"
            placeholder="Describe what reviewers should verify before scoring this template."
            rows={4}
            value={formValues.reviewerInstructions}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                reviewerInstructions: event.target.value,
              }))
            }
            color={state.fieldErrors?.reviewerInstructions ? "red" : undefined}
          />
          {state.fieldErrors?.reviewerInstructions?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="decisionGuidance">
            Decision guidance
          </Text>
          <TextArea
            id="decisionGuidance"
            name="decisionGuidance"
            placeholder="Document what typically leads to advance, hold, or reject outcomes."
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
          <Text as="label" size="2" weight="medium" htmlFor="rubricCriteria">
            Rubric criteria
          </Text>
          <TextArea
            id="rubricCriteria"
            name="rubricCriteria"
            placeholder={[
              "API design | Checks resource modeling and consistency | 40",
              "Correctness | Covers tests, edge cases, and runtime behavior | 35",
              "Communication | README, tradeoffs, and reviewer clarity | 25",
            ].join("\n")}
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
          <Text size="1" color="gray">
            One criterion per line using{" "}
            <strong>Title | Guidance | Weight</strong>. Guidance and weight are
            optional, but weight must be a whole number between 1 and 100 when
            provided.
          </Text>
          {state.fieldErrors?.rubricCriteria?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Callout.Root color="gray" size="1">
          <Callout.Text>
            The repository is created first in Gitea. If the local database
            write fails afterwards, the repository creation is rolled back
            automatically. Template-level review guidance stays local to Hiretea
            and can evolve without touching the repository contents. Saved
            reviewer defaults are preselected later during case assignment, but
            remain overrideable per candidate.
          </Callout.Text>
        </Callout.Root>

        {state.status === "error" && state.message ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        {state.status === "success" && state.message ? (
          <Callout.Root color="green" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        <SubmitButton />
      </Flex>
    </form>
  );
}
