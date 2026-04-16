"use client";

import { Button, Callout, Flex, Text, TextField } from "@radix-ui/themes";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type ProvisionCandidateActionState,
  provisionCandidateAction,
} from "@/app/(app)/dashboard/candidates/actions";

const initialProvisionCandidateState: ProvisionCandidateActionState = {
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
      Provision candidate
    </Button>
  );
}

export function CandidateProvisionForm() {
  const [state, formAction] = useActionState(
    provisionCandidateAction,
    initialProvisionCandidateState,
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
          <Text as="label" size="2" weight="medium" htmlFor="displayName">
            Display name
          </Text>
          <TextField.Root
            id="displayName"
            name="displayName"
            placeholder="Alex Morgan"
            type="text"
            color={state.fieldErrors?.displayName ? "red" : undefined}
          />
          {state.fieldErrors?.displayName?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="email">
            Email address
          </Text>
          <TextField.Root
            id="email"
            name="email"
            placeholder="alex@example.com"
            type="email"
            color={state.fieldErrors?.email ? "red" : undefined}
          />
          {state.fieldErrors?.email?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="username">
            Gitea username
          </Text>
          <TextField.Root
            id="username"
            name="username"
            placeholder="alex.morgan"
            type="text"
            color={state.fieldErrors?.username ? "red" : undefined}
          />
          {state.fieldErrors?.username?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Callout.Root color="gray" size="1">
          <Callout.Text>
            The candidate account is provisioned in Gitea first. When invite
            generation is available, the workspace now issues a secure
            onboarding link instead of exposing the temporary password directly
            in the roster, and every resend remains visible in the admin
            history.
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
            {state.inviteError ? (
              <Text size="1" color="gray" mt="2">
                {state.inviteError}
              </Text>
            ) : (
              <Text size="1" color="gray" mt="2">
                Use the copy onboarding invite button in the provisioned
                candidates list to share the link.
              </Text>
            )}
          </Callout.Root>
        ) : null}

        <SubmitButton />
      </Flex>
    </form>
  );
}
