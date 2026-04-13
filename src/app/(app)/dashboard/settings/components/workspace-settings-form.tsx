"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  initialUpdateWorkspaceSettingsState,
  updateWorkspaceSettingsAction,
} from "@/app/(app)/dashboard/settings/actions";
import styles from "@/app/(app)/dashboard/settings/page.module.css";

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
    <button
      className={`ui fluid primary button ${pending ? "loading disabled" : ""}`}
      disabled={pending}
      type="submit"
    >
      Save settings
    </button>
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
    <form action={formAction} className={`ui form ${styles.form}`}>
      <div className={`field ${state.fieldErrors?.companyName ? "error" : ""}`}>
        <label htmlFor="companyName">Company name</label>
        <input
          defaultValue={settings.companyName}
          id="companyName"
          name="companyName"
          type="text"
        />
        {state.fieldErrors?.companyName?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={styles.fieldGrid}>
        <div
          className={`field ${state.fieldErrors?.giteaBaseUrl ? "error" : ""}`}
        >
          <label htmlFor="giteaBaseUrl">Gitea base URL</label>
          <input
            defaultValue={settings.giteaBaseUrl}
            id="giteaBaseUrl"
            name="giteaBaseUrl"
            type="url"
          />
          {state.fieldErrors?.giteaBaseUrl?.map((error) => (
            <p className={styles.errorText} key={error}>
              {error}
            </p>
          ))}
        </div>

        <div
          className={`field ${state.fieldErrors?.giteaOrganization ? "error" : ""}`}
        >
          <label htmlFor="giteaOrganization">Gitea organization</label>
          <input
            defaultValue={settings.giteaOrganization}
            id="giteaOrganization"
            name="giteaOrganization"
            type="text"
          />
          {state.fieldErrors?.giteaOrganization?.map((error) => (
            <p className={styles.errorText} key={error}>
              {error}
            </p>
          ))}
        </div>
      </div>

      <div
        className={`field ${state.fieldErrors?.defaultBranch ? "error" : ""}`}
      >
        <label htmlFor="defaultBranch">Default branch</label>
        <input
          defaultValue={settings.defaultBranch}
          id="defaultBranch"
          name="defaultBranch"
          type="text"
        />
        {state.fieldErrors?.defaultBranch?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={styles.message}>
        <label className={styles.toggleRow} htmlFor="manualInviteMode">
          <input
            defaultChecked={settings.manualInviteMode}
            id="manualInviteMode"
            name="manualInviteMode"
            type="checkbox"
          />
          <span className={styles.toggleCopy}>
            <strong>Keep manual invites enabled</strong>
            <span className={styles.summary}>
              Manual invites remain the current MVP onboarding path for
              candidate provisioning.
            </span>
          </span>
        </label>
      </div>

      {state.status === "error" && state.message ? (
        <div className={`${styles.message} ${styles.messageError}`}>
          <p className={styles.summary}>{state.message}</p>
        </div>
      ) : null}

      {state.status === "success" && state.message ? (
        <div className={`${styles.message} ${styles.messageSuccess}`}>
          <p className={styles.summary}>{state.message}</p>
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
