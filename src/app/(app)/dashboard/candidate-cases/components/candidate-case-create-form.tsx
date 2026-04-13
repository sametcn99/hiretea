"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createCandidateCaseAction,
  initialCreateCandidateCaseState,
} from "@/app/(app)/dashboard/candidate-cases/actions";
import styles from "@/app/(app)/dashboard/candidate-cases/page.module.css";
import type { CandidateCaseAssignmentOptions } from "@/lib/candidate-cases/queries";

type CandidateCaseCreateFormProps = {
  assignmentOptions: CandidateCaseAssignmentOptions;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`ui fluid primary button ${pending ? "loading disabled" : ""}`}
      disabled={disabled || pending}
      type="submit"
    >
      Assign case
    </button>
  );
}

export function CandidateCaseCreateForm({
  assignmentOptions,
}: CandidateCaseCreateFormProps) {
  const [state, formAction] = useActionState(
    createCandidateCaseAction,
    initialCreateCandidateCaseState,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const hasRequiredOptions =
    assignmentOptions.candidates.length > 0 &&
    assignmentOptions.templates.length > 0;

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form
      action={formAction}
      className={`ui form ${styles.form}`}
      ref={formRef}
    >
      <div className={`field ${state.fieldErrors?.candidateId ? "error" : ""}`}>
        <label htmlFor="candidateId">Candidate</label>
        <select defaultValue="" id="candidateId" name="candidateId">
          <option disabled value="">
            Select a candidate
          </option>
          {assignmentOptions.candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.displayName} ({candidate.giteaLogin})
            </option>
          ))}
        </select>
        {state.fieldErrors?.candidateId?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div
        className={`field ${state.fieldErrors?.caseTemplateId ? "error" : ""}`}
      >
        <label htmlFor="caseTemplateId">Case template</label>
        <select defaultValue="" id="caseTemplateId" name="caseTemplateId">
          <option disabled value="">
            Select a template
          </option>
          {assignmentOptions.templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.slug})
            </option>
          ))}
        </select>
        {state.fieldErrors?.caseTemplateId?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={`field ${state.fieldErrors?.dueAt ? "error" : ""}`}>
        <label htmlFor="dueAt">Due date</label>
        <input id="dueAt" name="dueAt" type="date" />
        {state.fieldErrors?.dueAt?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={styles.message}>
        <p className={styles.summary}>
          The working repository is generated from the selected template inside{" "}
          {assignmentOptions.workspaceOrganization ??
            "the configured workspace organization"}
          . The candidate receives direct write access immediately after
          generation.
        </p>
      </div>

      {!hasRequiredOptions ? (
        <div className={`${styles.message} ${styles.messageError}`}>
          <p className={styles.summary}>
            Candidate assignment requires at least one provisioned candidate
            with a linked Gitea login and one case template.
          </p>
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <div className={`${styles.message} ${styles.messageError}`}>
          <p className={styles.summary}>{state.message}</p>
        </div>
      ) : null}

      {state.status === "success" && state.message ? (
        <div className={`${styles.message} ${styles.messageSuccess}`}>
          <p className={styles.summary}>{state.message}</p>
          {state.repositoryName ? (
            <span className={styles.metaText}>
              Repository: {state.repositoryName}
            </span>
          ) : null}
          {state.repositoryUrl ? (
            <a
              className={styles.link}
              href={state.repositoryUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open generated repository
            </a>
          ) : null}
        </div>
      ) : null}

      <SubmitButton disabled={!hasRequiredOptions} />
    </form>
  );
}
