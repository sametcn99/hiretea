"use client";

import {
  Box,
  Button,
  Callout,
  Code,
  Flex,
  Text,
  TextField,
} from "@radix-ui/themes";
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
            The temporary password is generated server-side and must be shared
            manually with the candidate during the MVP phase.
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
            {state.temporaryPassword ? (
              <Box
                mt="2"
                p="3"
                style={{
                  borderRadius: "var(--radius-2)",
                  background: "var(--gray-a2)",
                }}
              >
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray">
                    Temporary password
                  </Text>
                  <Code size="3" style={{ wordBreak: "break-all" }}>
                    {state.temporaryPassword}
                  </Code>
                </Flex>
              </Box>
            ) : null}
          </Callout.Root>
        ) : null}

        <SubmitButton />
      </Flex>
    </form>
  );
}
