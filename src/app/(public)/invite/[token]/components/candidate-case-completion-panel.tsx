"use client";

import { Badge, Box, Button, Callout, Flex, Text } from "@radix-ui/themes";
import { useActionState } from "react";
import {
  type ToggleCandidateCaseCompletionActionState,
  toggleCandidateCaseCompletionAction,
} from "../actions";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type CandidateCompletionSignalView =
  | { kind: "LOGIN_REQUIRED" }
  | { kind: "OPEN" }
  | {
      kind: "MARKED_REVERTIBLE";
      requestedAt: string;
      source: "MANUAL" | "AUTO_DEADLINE";
    }
  | {
      kind: "LOCKED_BY_DEADLINE";
      requestedAt: string | null;
      lockedAt: string;
      source: "MANUAL" | "AUTO_DEADLINE";
    }
  | {
      kind: "LOCKED_BY_REVIEW";
      requestedAt: string;
      source: "MANUAL" | "AUTO_DEADLINE";
      firstReviewNoteAt: string;
    };

type CandidateCaseCompletionPanelProps = {
  token: string;
  candidateCaseId: string;
  templateName: string;
  templateSlug: string;
  status: string;
  workingRepository: string | null;
  workingRepositoryUrl: string | null;
  dueAt: string | null;
  completion: CandidateCompletionSignalView;
};

const initialState: ToggleCandidateCaseCompletionActionState = {
  status: "idle",
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return dateFormatter.format(parsed);
}

export function CandidateCaseCompletionPanel(
  props: CandidateCaseCompletionPanelProps,
) {
  const {
    token,
    candidateCaseId,
    templateName,
    templateSlug,
    status,
    workingRepository,
    workingRepositoryUrl,
    dueAt,
    completion,
  } = props;

  const [state, formAction, isPending] = useActionState(
    toggleCandidateCaseCompletionAction,
    initialState,
  );

  const dueAtLabel = formatDate(dueAt);
  const actionMatchesThisCase = state.candidateCaseId === candidateCaseId;

  return (
    <Box
      style={{
        border: "1px solid var(--gray-a4)",
        borderRadius: "var(--radius-3)",
        padding: "1rem",
      }}
    >
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Flex direction="column" gap="1">
            <Text size="3" weight="bold">
              {templateName}
            </Text>
            <Text size="1" color="gray">
              {templateSlug}
            </Text>
          </Flex>
          <Flex gap="2" align="center" wrap="wrap">
            <Badge variant="soft">{status.toLowerCase()}</Badge>
            {dueAtLabel ? (
              <Badge variant="outline" color="amber">
                Due {dueAtLabel}
              </Badge>
            ) : null}
          </Flex>
        </Flex>

        {workingRepositoryUrl ? (
          <Text size="2" color="gray">
            Working repository:{" "}
            <a
              href={workingRepositoryUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {workingRepository ?? workingRepositoryUrl}
            </a>
          </Text>
        ) : null}

        <CompletionContent completion={completion} />

        {actionMatchesThisCase && state.status === "error" && state.message ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        {actionMatchesThisCase &&
        state.status === "success" &&
        state.message ? (
          <Callout.Root color="green" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        <CompletionForm
          token={token}
          candidateCaseId={candidateCaseId}
          completion={completion}
          formAction={formAction}
          isPending={isPending && actionMatchesThisCase}
        />
      </Flex>
    </Box>
  );
}

function CompletionContent({
  completion,
}: {
  completion: CandidateCompletionSignalView;
}) {
  if (completion.kind === "LOGIN_REQUIRED") {
    return (
      <Callout.Root color="amber" size="1">
        <Callout.Text>
          Sign in to Gitea with the credentials above at least once before you
          can mark this case complete.
        </Callout.Text>
      </Callout.Root>
    );
  }

  if (completion.kind === "OPEN") {
    return (
      <Text size="2" color="gray">
        When you have finished this case, mark it complete so reviewers can
        start scoring.
      </Text>
    );
  }

  if (completion.kind === "MARKED_REVERTIBLE") {
    return (
      <Callout.Root color="blue" size="1">
        <Callout.Text>
          Marked complete on {formatDate(completion.requestedAt)}. You can still
          unmark the case until a reviewer adds the first note or the deadline
          passes.
        </Callout.Text>
      </Callout.Root>
    );
  }

  if (completion.kind === "LOCKED_BY_REVIEW") {
    return (
      <Callout.Root color="gray" size="1">
        <Callout.Text>
          A reviewer opened your case on{" "}
          {formatDate(completion.firstReviewNoteAt)}. Completion can no longer
          be reverted.
        </Callout.Text>
      </Callout.Root>
    );
  }

  const lockedAtLabel = formatDate(completion.lockedAt);

  return (
    <Callout.Root color="amber" size="1">
      <Callout.Text>
        Deadline reached on {lockedAtLabel}. Completion is locked and the case
        was sent to reviewers.
      </Callout.Text>
    </Callout.Root>
  );
}

function CompletionForm({
  token,
  candidateCaseId,
  completion,
  formAction,
  isPending,
}: {
  token: string;
  candidateCaseId: string;
  completion: CandidateCompletionSignalView;
  formAction: (formData: FormData) => void;
  isPending: boolean;
}) {
  if (
    completion.kind === "LOCKED_BY_DEADLINE" ||
    completion.kind === "LOCKED_BY_REVIEW"
  ) {
    return null;
  }

  const isMarkIntent = completion.kind !== "MARKED_REVERTIBLE";
  const buttonLabel = isMarkIntent ? "Mark case complete" : "Unmark completion";
  const buttonColor = isMarkIntent ? undefined : "gray";
  const disabled = isPending || completion.kind === "LOGIN_REQUIRED";

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="candidateCaseId" value={candidateCaseId} />
      <input
        type="hidden"
        name="intent"
        value={isMarkIntent ? "mark" : "unmark"}
      />
      <Button
        type="submit"
        disabled={disabled}
        color={buttonColor}
        variant={isMarkIntent ? "solid" : "soft"}
      >
        {isPending ? "Saving..." : buttonLabel}
      </Button>
    </form>
  );
}
