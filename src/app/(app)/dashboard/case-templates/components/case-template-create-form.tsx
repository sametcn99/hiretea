"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createCaseTemplateAction,
  initialCreateCaseTemplateState,
} from "@/app/(app)/dashboard/case-templates/actions";
import styles from "@/app/(app)/dashboard/case-templates/page.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={`ui fluid primary button ${pending ? "loading disabled" : ""}`}
      disabled={pending}
      type="submit"
    >
      Create template
    </button>
  );
}

export function CaseTemplateCreateForm() {
  const [state, formAction] = useActionState(
    createCaseTemplateAction,
    initialCreateCaseTemplateState,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      <div className={`field ${state.fieldErrors?.name ? "error" : ""}`}>
        <label htmlFor="name">Template name</label>
        <input
          id="name"
          name="name"
          placeholder="Backend API challenge"
          type="text"
        />
        {state.fieldErrors?.name?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={`field ${state.fieldErrors?.slug ? "error" : ""}`}>
        <label htmlFor="slug">Template slug</label>
        <input
          id="slug"
          name="slug"
          placeholder="backend-api-challenge"
          type="text"
        />
        {state.fieldErrors?.slug?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={`field ${state.fieldErrors?.summary ? "error" : ""}`}>
        <label htmlFor="summary">Summary</label>
        <textarea
          id="summary"
          name="summary"
          placeholder="A concise description of the challenge, expected output, and review focus."
          rows={4}
        />
        {state.fieldErrors?.summary?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div
        className={`field ${state.fieldErrors?.repositoryName ? "error" : ""}`}
      >
        <label htmlFor="repositoryName">Repository name</label>
        <input
          id="repositoryName"
          name="repositoryName"
          placeholder="backend-api-challenge"
          type="text"
        />
        {state.fieldErrors?.repositoryName?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className="field">
        <label htmlFor="repositoryDescription">Repository description</label>
        <textarea
          id="repositoryDescription"
          name="repositoryDescription"
          placeholder="Optional short description that will be stored in Gitea."
          rows={3}
        />
        {state.fieldErrors?.repositoryDescription?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div
        className={`field ${state.fieldErrors?.defaultBranch ? "error" : ""}`}
      >
        <label htmlFor="defaultBranch">Default branch</label>
        <input
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

      <div className={styles.message}>
        <p className={styles.summary}>
          The repository is created first in Gitea. If the local database write
          fails afterwards, the repository creation is rolled back
          automatically.
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
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
