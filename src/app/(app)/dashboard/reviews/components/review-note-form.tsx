"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createEvaluationNoteAction,
  initialCreateEvaluationNoteState,
} from "@/app/(app)/dashboard/reviews/actions";
import styles from "@/app/(app)/dashboard/reviews/page.module.css";
import type { ReviewCaseListItem } from "@/lib/evaluation-notes/queries";

type ReviewNoteFormProps = {
  reviewCases: ReviewCaseListItem[];
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`ui fluid primary button ${pending ? "loading disabled" : ""}`}
      disabled={disabled || pending}
      type="submit"
    >
      Save review note
    </button>
  );
}

export function ReviewNoteForm({ reviewCases }: ReviewNoteFormProps) {
  const [state, formAction] = useActionState(
    createEvaluationNoteAction,
    initialCreateEvaluationNoteState,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const hasReviewCases = reviewCases.length > 0;

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
      <div
        className={`field ${state.fieldErrors?.candidateCaseId ? "error" : ""}`}
      >
        <label htmlFor="candidateCaseId">Candidate case</label>
        <select defaultValue="" id="candidateCaseId" name="candidateCaseId">
          <option disabled value="">
            Select a candidate case
          </option>
          {reviewCases.map((reviewCase) => (
            <option key={reviewCase.id} value={reviewCase.id}>
              {reviewCase.candidateDisplayName} / {reviewCase.templateName} (
              {reviewCase.status.toLowerCase().replace(/_/g, " ")})
            </option>
          ))}
        </select>
        {state.fieldErrors?.candidateCaseId?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={`field ${state.fieldErrors?.score ? "error" : ""}`}>
        <label htmlFor="score">Score (1-10)</label>
        <input
          defaultValue="7"
          id="score"
          max="10"
          min="1"
          name="score"
          step="1"
          type="number"
        />
        {state.fieldErrors?.score?.map((error) => (
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
          placeholder="Short verdict on the implementation quality, delivery, and correctness."
          rows={3}
        />
        {state.fieldErrors?.summary?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className="field">
        <label htmlFor="note">Detailed note</label>
        <textarea
          id="note"
          name="note"
          placeholder="Capture concrete observations, follow-up questions, and strengths or risks."
          rows={6}
        />
        {state.fieldErrors?.note?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={`field ${state.fieldErrors?.decision ? "error" : ""}`}>
        <label htmlFor="decision">Decision</label>
        <select defaultValue="" id="decision" name="decision">
          <option value="">No final decision yet</option>
          <option value="ADVANCE">Advance</option>
          <option value="HOLD">Hold</option>
          <option value="REJECT">Reject</option>
        </select>
        {state.fieldErrors?.decision?.map((error) => (
          <p className={styles.errorText} key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className={styles.message}>
        <label className={styles.toggleRow} htmlFor="finalizeReview">
          <input id="finalizeReview" name="finalizeReview" type="checkbox" />
          <span className={styles.toggleCopy}>
            <strong>Mark this review as complete</strong>
            <span className={styles.summary}>
              Completing the review moves the case to completed status and
              requires a final decision.
            </span>
          </span>
        </label>
      </div>

      {!hasReviewCases ? (
        <div className={`${styles.message} ${styles.messageError}`}>
          <p className={styles.summary}>
            Reviewer notes require at least one assigned candidate case.
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
          {typeof state.latestScore === "number" ? (
            <span className={styles.metaText}>
              Latest score: {state.latestScore}/10
            </span>
          ) : null}
        </div>
      ) : null}

      <SubmitButton disabled={!hasReviewCases} />
    </form>
  );
}
