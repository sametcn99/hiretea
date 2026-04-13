"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  initialProvisionCandidateState,
  provisionCandidateAction,
} from "@/app/(app)/dashboard/candidates/actions";
import styles from "@/app/(app)/dashboard/candidates/page.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={`ui fluid primary button ${pending ? "loading disabled" : ""}`}
      disabled={pending}
      type="submit"
    >
      Provision candidate
    </button>
  );
}

export function CandidateProvisionForm() {
  const [state, formAction] = useActionState(
    provisionCandidateAction,
    initialProvisionCandidateState,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      <div className={`field ${state.fieldErrors?.displayName ? "error" : ""}`}>
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          name="displayName"
          placeholder="Alex Morgan"
          type="text"
        />
        {state.fieldErrors?.displayName?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={`field ${state.fieldErrors?.email ? "error" : ""}`}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          placeholder="alex@example.com"
          type="email"
        />
        {state.fieldErrors?.email?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={`field ${state.fieldErrors?.username ? "error" : ""}`}>
        <label htmlFor="username">Gitea username</label>
        <input
          id="username"
          name="username"
          placeholder="alex.morgan"
          type="text"
        />
        {state.fieldErrors?.username?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={styles.message}>
        <p style={{ margin: 0 }}>
          The temporary password is generated server-side and must be shared
          manually with the candidate during the MVP phase.
        </p>
      </div>

      {state.status === "error" && state.message ? (
        <div className={`${styles.message} ${styles.messageError}`}>
          <p style={{ margin: 0 }}>{state.message}</p>
        </div>
      ) : null}

      {state.status === "success" && state.message ? (
        <div className={`${styles.message} ${styles.messageSuccess}`}>
          <p style={{ margin: 0 }}>{state.message}</p>
          {state.temporaryPassword ? (
            <div className={styles.passwordBox}>
              <span className="ht-muted">Temporary password</span>
              <span className={styles.passwordValue}>
                {state.temporaryPassword}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
