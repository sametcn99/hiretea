"use client";

import { Button, Callout, Flex, Text, TextField } from "@radix-ui/themes";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type ProvisionRecruiterActionState,
  provisionRecruiterAction,
} from "@/app/(app)/dashboard/team/actions";

const initialProvisionRecruiterState: ProvisionRecruiterActionState = {
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
      Provision team member
    </Button>
  );
}

export function RecruiterProvisionForm({
  successRedirectPath,
}: {
  successRedirectPath?: Route;
}) {
  const [state, formAction] = useActionState(
    provisionRecruiterAction,
    initialProvisionRecruiterState,
  );
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      if (successRedirectPath) {
        router.replace(successRedirectPath);
        return;
      }

      setFormKey((key) => key + 1);
    }
  }, [router, state.status, successRedirectPath]);

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
            placeholder="Jamie Chen"
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
            placeholder="jamie@example.com"
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
            placeholder="jamie.chen"
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
            New recruiting team members receive full Hiretea dashboard access
            except workspace settings and user management. Their Gitea account
            is added to the internal recruiter team automatically.
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
                Use the copy onboarding invite button in the roster to share the
                first-time access link.
              </Text>
            )}
          </Callout.Root>
        ) : null}

        <SubmitButton />
      </Flex>
    </form>
  );
}
