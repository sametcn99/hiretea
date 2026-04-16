"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import {
  deleteCaseAction,
  restoreCaseAction,
  revokeAccessAction,
} from "../actions";

type DialogName = "archive" | "revoke" | "restore";
type OpenDialog = DialogName | null;
type CaseActionResult = Awaited<ReturnType<typeof deleteCaseAction>>;

type CandidateCaseActionStateInput = {
  candidateCaseId: string;
  candidateDisplayName: string;
  workingRepository: string | null;
};

export function useCandidateCaseActionState({
  candidateCaseId,
  candidateDisplayName,
  workingRepository,
}: CandidateCaseActionStateInput) {
  const { showToast } = useToast();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [isLoading, setIsLoading] = useState(false);

  function createDialogSetter(dialogName: DialogName) {
    return (open: boolean) => {
      setOpenDialog(open ? dialogName : null);
    };
  }

  async function runAction(
    dialogName: DialogName,
    action: (caseId: string) => Promise<CaseActionResult>,
    successFeedback: {
      title: string;
      description: string;
    },
    errorTitle: string,
  ) {
    setIsLoading(true);

    const result = await action(candidateCaseId);

    if (result.status === "error") {
      showToast({
        tone: "error",
        title: errorTitle,
        description: result.message,
      });
      setIsLoading(false);
      return;
    }

    showToast({
      tone: "success",
      title: successFeedback.title,
      description: successFeedback.description,
    });

    setOpenDialog((currentDialog) =>
      currentDialog === dialogName ? null : currentDialog,
    );
    setIsLoading(false);
  }

  return {
    isArchiveAlertOpen: openDialog === "archive",
    isRevokeAlertOpen: openDialog === "revoke",
    isRestoreAlertOpen: openDialog === "restore",
    setIsArchiveAlertOpen: createDialogSetter("archive"),
    setIsRevokeAlertOpen: createDialogSetter("revoke"),
    setIsRestoreAlertOpen: createDialogSetter("restore"),
    isLoading,
    handleArchive: () =>
      runAction(
        "archive",
        deleteCaseAction,
        {
          title: "Candidate case archived",
          description: `${candidateDisplayName} was archived and candidate access was revoked.`,
        },
        "Candidate case archive failed",
      ),
    handleRevoke: () =>
      runAction(
        "revoke",
        revokeAccessAction,
        {
          title: "Candidate access revoked",
          description: `Access to ${workingRepository ?? "the working repository"} was revoked successfully.`,
        },
        "Candidate access revoke failed",
      ),
    handleRestore: () =>
      runAction(
        "restore",
        restoreCaseAction,
        {
          title: "Candidate case restored",
          description: `${candidateDisplayName} is back in the active workflow.`,
        },
        "Candidate case restore failed",
      ),
  };
}
