"use client";

import {
  Button,
  Callout,
  Flex,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type CreateCaseTemplateActionState,
  createCaseTemplateAction,
} from "@/app/(app)/dashboard/case-templates/actions";

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

export function CaseTemplateCreateForm() {
  const [state, formAction] = useActionState(
    createCaseTemplateAction,
    initialCreateCaseTemplateState,
  );
  const [formValues, setFormValues] = useState(initialFormValues);

  useEffect(() => {
    if (state.status === "success") {
      setFormValues(initialFormValues);
    }
  }, [state.status]);

  return (
    <form action={formAction}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="name">
            Template name
          </Text>
          <TextField.Root
            id="name"
            name="name"
            placeholder="Backend API challenge"
            type="text"
            value={formValues.name}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
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
            Template slug
          </Text>
          <TextField.Root
            id="slug"
            name="slug"
            placeholder="backend-api-challenge"
            type="text"
            value={formValues.slug}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                slug: event.target.value,
              }))
            }
            color={state.fieldErrors?.slug ? "red" : undefined}
          />
          {state.fieldErrors?.slug?.map((error) => (
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
          <Text as="label" size="2" weight="medium" htmlFor="repositoryName">
            Repository name
          </Text>
          <TextField.Root
            id="repositoryName"
            name="repositoryName"
            placeholder="backend-api-challenge"
            type="text"
            value={formValues.repositoryName}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                repositoryName: event.target.value,
              }))
            }
            color={state.fieldErrors?.repositoryName ? "red" : undefined}
          />
          {state.fieldErrors?.repositoryName?.map((error) => (
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
          <Text as="label" size="2" weight="medium" htmlFor="defaultBranch">
            Default branch
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

        <Callout.Root color="gray" size="1">
          <Callout.Text>
            The repository is created first in Gitea. If the local database
            write fails afterwards, the repository creation is rolled back
            automatically. Template-level review guidance stays local to Hiretea
            and can evolve without touching the repository contents.
          </Callout.Text>
        </Callout.Root>

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
