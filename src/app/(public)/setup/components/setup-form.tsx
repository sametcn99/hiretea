"use client";

import { Button, Callout, Flex, Grid, Text, TextField } from "@radix-ui/themes";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeBootstrapSetupAction,
  initialSetupActionState,
} from "@/app/(public)/setup/actions";

type SetupFormProps = {
  bootstrapEnabled: boolean;
  defaultValues: {
    companyName: string;
    giteaBaseUrl: string;
    giteaOrganization: string;
    defaultBranch: string;
  };
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      size="3"
      loading={pending}
      disabled={disabled || pending}
      type="submit"
    >
      Complete setup
    </Button>
  );
}

export function SetupForm({ bootstrapEnabled, defaultValues }: SetupFormProps) {
  const [state, formAction] = useActionState(
    completeBootstrapSetupAction,
    initialSetupActionState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="manualInviteMode" value="on" />
      <Flex direction="column" gap="4">
        {!bootstrapEnabled ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>
              Add BOOTSTRAP_TOKEN to your environment before running the first
              setup. The form remains read-only until that token exists.
            </Callout.Text>
          </Callout.Root>
        ) : null}

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="bootstrapToken">
            Bootstrap token
          </Text>
          <TextField.Root
            id="bootstrapToken"
            name="bootstrapToken"
            placeholder="Enter the one-time setup token"
            type="password"
            color={state.fieldErrors?.bootstrapToken ? "red" : undefined}
          />
          {state.fieldErrors?.bootstrapToken?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Grid columns="2" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="adminEmail">
              First admin email
            </Text>
            <TextField.Root
              id="adminEmail"
              name="adminEmail"
              placeholder="admin@company.com"
              type="email"
              color={state.fieldErrors?.adminEmail ? "red" : undefined}
            />
            {state.fieldErrors?.adminEmail?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="adminName">
              First admin name
            </Text>
            <TextField.Root
              id="adminName"
              name="adminName"
              placeholder="Hiring operations"
              type="text"
              color={state.fieldErrors?.adminName ? "red" : undefined}
            />
            {state.fieldErrors?.adminName?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>
        </Grid>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="companyName">
            Company name
          </Text>
          <TextField.Root
            defaultValue={defaultValues.companyName}
            id="companyName"
            name="companyName"
            type="text"
            color={state.fieldErrors?.companyName ? "red" : undefined}
          />
          {state.fieldErrors?.companyName?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Grid columns="2" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="giteaBaseUrl">
              Gitea base URL
            </Text>
            <TextField.Root
              defaultValue={defaultValues.giteaBaseUrl}
              id="giteaBaseUrl"
              name="giteaBaseUrl"
              placeholder="https://gitea.example.com"
              type="url"
              color={state.fieldErrors?.giteaBaseUrl ? "red" : undefined}
            />
            {state.fieldErrors?.giteaBaseUrl?.map((error) => (
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
              htmlFor="giteaOrganization"
            >
              Gitea organization
            </Text>
            <TextField.Root
              defaultValue={defaultValues.giteaOrganization}
              id="giteaOrganization"
              name="giteaOrganization"
              placeholder="engineering"
              type="text"
              color={state.fieldErrors?.giteaOrganization ? "red" : undefined}
            />
            {state.fieldErrors?.giteaOrganization?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>
        </Grid>

        <Grid columns="2" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="defaultBranch">
              Default branch
            </Text>
            <TextField.Root
              defaultValue={defaultValues.defaultBranch}
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

          <Flex direction="column" gap="1">
            <Text as="p" size="2" weight="medium" mb="1">
              Candidate onboarding
            </Text>
            <Callout.Root color="blue" size="1">
              <Callout.Text>
                Candidate onboarding stays on manual credential handoff during
                the current MVP. First-run setup stores that operating mode
                automatically.
              </Callout.Text>
            </Callout.Root>
          </Flex>
        </Grid>

        <Callout.Root color="blue" size="1">
          <Callout.Text>
            The first admin must later authenticate through Gitea with the same
            email address entered above.
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

        <Flex gap="3" align="center">
          <SubmitButton
            disabled={!bootstrapEnabled || state.status === "success"}
          />
          {state.status === "success" ? (
            <Button asChild variant="outline" size="3">
              <Link href="/sign-in">Continue to sign-in</Link>
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </form>
  );
}
