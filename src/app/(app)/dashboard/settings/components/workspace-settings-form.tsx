"use client";

import { Button, Callout, Flex, Grid, Text, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  type UpdateWorkspaceSettingsActionState,
  updateWorkspaceSettingsAction,
} from "@/app/(app)/dashboard/settings/actions";

const initialUpdateWorkspaceSettingsState: UpdateWorkspaceSettingsActionState =
  {
    status: "idle",
  };

type WorkspaceSettingsRecord = {
  id: string;
  companyName: string;
  defaultBranch: string;
  manualInviteMode: boolean;
  giteaMode: "bundled" | "external";
  giteaBaseUrl: string;
  giteaAdminBaseUrl: string | null;
  giteaOrganization: string;
  giteaAuthClientId: string | null;
  hasStoredExternalSecrets: boolean;
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
      <input type="hidden" name="giteaMode" value={settings.giteaMode} />
      <input type="hidden" name="manualInviteMode" value="on" />
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="companyName">
            Company name
          </Text>
          <TextField.Root
            id="companyName"
            name="companyName"
            defaultValue={settings.companyName}
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
              Public Gitea URL
            </Text>
            <TextField.Root
              id="giteaBaseUrl"
              name="giteaBaseUrl"
              defaultValue={settings.giteaBaseUrl}
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
              id="giteaOrganization"
              name="giteaOrganization"
              defaultValue={settings.giteaOrganization}
              color={state.fieldErrors?.giteaOrganization ? "red" : undefined}
            />
            {state.fieldErrors?.giteaOrganization?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>
        </Grid>

        {settings.giteaMode === "external" ? (
          <>
            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor="giteaAdminBaseUrl"
              >
                Admin API base URL
              </Text>
              <TextField.Root
                id="giteaAdminBaseUrl"
                name="giteaAdminBaseUrl"
                defaultValue={settings.giteaAdminBaseUrl ?? ""}
                placeholder="Leave empty to reuse the public URL"
                type="url"
                color={state.fieldErrors?.giteaAdminBaseUrl ? "red" : undefined}
              />
              {state.fieldErrors?.giteaAdminBaseUrl?.map((error) => (
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
                htmlFor="giteaAuthClientId"
              >
                OAuth client ID
              </Text>
              <TextField.Root
                id="giteaAuthClientId"
                name="giteaAuthClientId"
                defaultValue={settings.giteaAuthClientId ?? ""}
                placeholder="hiretea-client-id"
                color={state.fieldErrors?.giteaAuthClientId ? "red" : undefined}
              />
              {state.fieldErrors?.giteaAuthClientId?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>

            <Grid columns="2" gap="3">
              <Flex direction="column" gap="1">
                <Text
                  as="label"
                  size="2"
                  weight="medium"
                  htmlFor="giteaAuthClientSecret"
                >
                  Replace OAuth client secret
                </Text>
                <TextField.Root
                  id="giteaAuthClientSecret"
                  name="giteaAuthClientSecret"
                  placeholder={
                    settings.hasStoredExternalSecrets
                      ? "Leave blank to keep the stored secret"
                      : "Paste the client secret"
                  }
                  type="password"
                  color={
                    state.fieldErrors?.giteaAuthClientSecret ? "red" : undefined
                  }
                />
                {state.fieldErrors?.giteaAuthClientSecret?.map((error) => (
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
                  htmlFor="giteaAdminToken"
                >
                  Replace admin token
                </Text>
                <TextField.Root
                  id="giteaAdminToken"
                  name="giteaAdminToken"
                  placeholder={
                    settings.hasStoredExternalSecrets
                      ? "Leave blank to keep the stored token"
                      : "Paste the admin token"
                  }
                  type="password"
                  color={state.fieldErrors?.giteaAdminToken ? "red" : undefined}
                />
                {state.fieldErrors?.giteaAdminToken?.map((error) => (
                  <Text size="1" color="red" key={error}>
                    {error}
                  </Text>
                ))}
              </Flex>
            </Grid>

            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor="giteaWebhookSecret"
              >
                Replace webhook secret
              </Text>
              <TextField.Root
                id="giteaWebhookSecret"
                name="giteaWebhookSecret"
                placeholder={
                  settings.hasStoredExternalSecrets
                    ? "Leave blank to keep the stored webhook secret"
                    : "Paste the shared webhook secret"
                }
                type="password"
                color={
                  state.fieldErrors?.giteaWebhookSecret ? "red" : undefined
                }
              />
              {state.fieldErrors?.giteaWebhookSecret?.map((error) => (
                <Text size="1" color="red" key={error}>
                  {error}
                </Text>
              ))}
            </Flex>
          </>
        ) : null}

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="defaultBranch">
            Default branch
          </Text>
          <TextField.Root
            id="defaultBranch"
            name="defaultBranch"
            defaultValue={settings.defaultBranch}
            color={state.fieldErrors?.defaultBranch ? "red" : undefined}
          />
          {state.fieldErrors?.defaultBranch?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Callout.Root color="blue" size="1">
          <Callout.Text>
            {settings.giteaMode === "external"
              ? "External Gitea credentials are stored encrypted at rest. Leave the password fields empty to keep the current encrypted values."
              : "Bundled mode continues to keep OAuth and admin connection values in the generated runtime environment."}{" "}
            {settings.manualInviteMode
              ? "Automatic delivery is not available yet."
              : "Saving these settings will restore the manual handoff mode."}
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
