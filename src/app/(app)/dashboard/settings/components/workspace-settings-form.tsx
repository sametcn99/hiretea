"use client";

import { Button, Callout, Checkbox, Flex, Grid, Text, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  initialUpdateWorkspaceSettingsState,
  updateWorkspaceSettingsAction,
} from "@/app/(app)/dashboard/settings/actions";

type WorkspaceSettingsRecord = {
  id: string;
  companyName: string;
  defaultBranch: string;
  manualInviteMode: boolean;
  giteaBaseUrl: string;
  giteaOrganization: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkspaceSettingsFormProps = {
  settings: WorkspaceSettingsRecord;
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
      Save settings
    </Button>
  );
}

export function WorkspaceSettingsForm({
  settings,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateWorkspaceSettingsAction,
    initialUpdateWorkspaceSettingsState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="companyName">Company name</Text>
          <TextField.Root
            id="companyName"
            name="companyName"
            defaultValue={settings.companyName}
            color={state.fieldErrors?.companyName ? "red" : undefined}
          />
          {state.fieldErrors?.companyName?.map((error) => (
            <Text size="1" color="red" key={error}>{error}</Text>
          ))}
        </Flex>

        <Grid columns="2" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="giteaBaseUrl">Gitea base URL</Text>
            <TextField.Root
              id="giteaBaseUrl"
              name="giteaBaseUrl"
              defaultValue={settings.giteaBaseUrl}
              type="url"
              color={state.fieldErrors?.giteaBaseUrl ? "red" : undefined}
            />
            {state.fieldErrors?.giteaBaseUrl?.map((error) => (
              <Text size="1" color="red" key={error}>{error}</Text>
            ))}
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="giteaOrganization">Gitea organization</Text>
            <TextField.Root
              id="giteaOrganization"
              name="giteaOrganization"
              defaultValue={settings.giteaOrganization}
              color={state.fieldErrors?.giteaOrganization ? "red" : undefined}
            />
            {state.fieldErrors?.giteaOrganization?.map((error) => (
              <Text size="1" color="red" key={error}>{error}</Text>
            ))}
          </Flex>
        </Grid>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="defaultBranch">Default branch</Text>
          <TextField.Root
            id="defaultBranch"
            name="defaultBranch"
            defaultValue={settings.defaultBranch}
            color={state.fieldErrors?.defaultBranch ? "red" : undefined}
          />
          {state.fieldErrors?.defaultBranch?.map((error) => (
            <Text size="1" color="red" key={error}>{error}</Text>
          ))}
        </Flex>

        <Flex gap="3" align="start">
          <Checkbox
            name="manualInviteMode"
            id="manualInviteMode"
            defaultChecked={settings.manualInviteMode}
          />
          <Flex direction="column" gap="1">
            <Text as="label" htmlFor="manualInviteMode" size="2" weight="bold">
              Keep manual invites enabled
            </Text>
            <Text size="1" color="gray">
              Manual invites remain the current MVP onboarding path for
              candidate provisioning.
            </Text>
          </Flex>
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
