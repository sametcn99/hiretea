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
  createCaseTemplateAction,
  type CreateCaseTemplateActionState,
} from "@/app/(app)/dashboard/case-templates/actions";

const initialCreateCaseTemplateState: CreateCaseTemplateActionState = {
  status: "idle",
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
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.status === "success") {
      setFormKey((k) => k + 1);
    }
  }, [state.status]);

  return (
    <form action={formAction} key={formKey}>
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
            automatically.
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
