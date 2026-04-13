"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeBootstrapSetupAction,
  initialSetupActionState,
} from "@/app/(public)/setup/actions";
import styles from "@/app/(public)/setup/page.module.css";

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
    <button
      className={`ui primary button ${pending ? "loading disabled" : ""}`}
      disabled={disabled || pending}
      type="submit"
    >
      Complete setup
    </button>
  );
}

export function SetupForm({ bootstrapEnabled, defaultValues }: SetupFormProps) {
  const [state, formAction] = useActionState(
    completeBootstrapSetupAction,
    initialSetupActionState,
  );

  return (
    <form action={formAction} className={`ui form ${styles.form}`}>
      {!bootstrapEnabled ? (
        <div className={`${styles.message} ${styles.messageError}`}>
          <p className={styles.summary}>
            Add BOOTSTRAP_TOKEN to your environment before running the first
            setup. The form remains read-only until that token exists.
          </p>
        </div>
      ) : null}

      <div
        className={`field ${state.fieldErrors?.bootstrapToken ? "error" : ""}`}
      >
        <label htmlFor="bootstrapToken">Bootstrap token</label>
        <input
          id="bootstrapToken"
          name="bootstrapToken"
          placeholder="Enter the one-time setup token"
          type="password"
        />
        {state.fieldErrors?.bootstrapToken?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={styles.fieldGrid}>
        <div
          className={`field ${state.fieldErrors?.adminEmail ? "error" : ""}`}
        >
          <label htmlFor="adminEmail">First admin email</label>
          <input
            id="adminEmail"
            name="adminEmail"
            placeholder="admin@company.com"
            type="email"
          />
          {state.fieldErrors?.adminEmail?.map((error) => (
            <p className={styles.errorText} key={error}>
              {error}
            </p>
          ))}
        </div>

        <div className={`field ${state.fieldErrors?.adminName ? "error" : ""}`}>
          <label htmlFor="adminName">First admin name</label>
          <input
            id="adminName"
            name="adminName"
            placeholder="Hiring operations"
            type="text"
          />
          {state.fieldErrors?.adminName?.map((error) => (
            <p className={styles.errorText} key={error}>
              {error}
            </p>
          ))}
        </div>
      </div>

      <div className={`field ${state.fieldErrors?.companyName ? "error" : ""}`}>
        <label htmlFor="companyName">Company name</label>
        <input
          defaultValue={defaultValues.companyName}
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
            defaultValue={defaultValues.giteaBaseUrl}
            id="giteaBaseUrl"
            name="giteaBaseUrl"
            placeholder="https://gitea.example.com"
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
            defaultValue={defaultValues.giteaOrganization}
            id="giteaOrganization"
            name="giteaOrganization"
            placeholder="engineering"
            type="text"
          />
          {state.fieldErrors?.giteaOrganization?.map((error) => (
            <p className={styles.errorText} key={error}>
              {error}
            </p>
          ))}
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <div
          className={`field ${state.fieldErrors?.defaultBranch ? "error" : ""}`}
        >
          <label htmlFor="defaultBranch">Default branch</label>
          <input
            defaultValue={defaultValues.defaultBranch}
            id="defaultBranch"
            name="defaultBranch"
            placeholder="main"
            type="text"
          />
          {state.fieldErrors?.defaultBranch?.map((error) => (
            <p className={styles.errorText} key={error}>
              {error}
            </p>
          ))}
        </div>

        <div className="field">
          <p style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Invite mode</p>
          <div className={styles.message}>
            <label className={styles.toggleRow} htmlFor="manualInviteMode">
              <input
                defaultChecked
                id="manualInviteMode"
                name="manualInviteMode"
                type="checkbox"
              />
              <span className={styles.toggleCopy}>
                <strong>Keep manual invites enabled</strong>
                <span className={styles.summary}>
                  Recommended for the current MVP. Candidate onboarding remains
                  a deliberate internal action.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.message}>
        <p className={styles.summary}>
          The first admin must later authenticate through Gitea with the same
          email address entered above.
        </p>
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

      <div className={styles.buttonRow}>
        <SubmitButton
          disabled={!bootstrapEnabled || state.status === "success"}
        />
        {state.status === "success" ? (
          <Link className={styles.linkButton} href="/sign-in">
            Continue to sign-in
          </Link>
        ) : null}
      </div>
    </form>
  );
}
