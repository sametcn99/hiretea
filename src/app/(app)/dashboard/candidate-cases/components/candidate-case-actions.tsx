"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import type {
  CandidateCaseAssignmentOptions,
  CandidateCaseListItem,
} from "@/lib/candidate-cases/queries";
import { CandidateCaseConfirmationDialog } from "./candidate-case-confirmation-dialog";
import { EditCandidateCaseDialog } from "./edit-candidate-case-dialog";
import { useCandidateCaseActionState } from "./use-candidate-case-action-state";

type CandidateCaseActionsProps = {
  candidateCase: CandidateCaseListItem;
  assignmentOptions: CandidateCaseAssignmentOptions;
};

export function CandidateCaseActions({
  candidateCase,
  assignmentOptions,
}: CandidateCaseActionsProps) {
  const {
    isArchiveAlertOpen,
    isRevokeAlertOpen,
    isRestoreAlertOpen,
    setIsArchiveAlertOpen,
    setIsRevokeAlertOpen,
    setIsRestoreAlertOpen,
    isLoading,
    handleArchive,
    handleRevoke,
    handleRestore,
  } = useCandidateCaseActionState({
    candidateCaseId: candidateCase.id,
    candidateDisplayName: candidateCase.candidateDisplayName,
    workingRepository: candidateCase.workingRepository,
  });

  return (
    <>
      <Flex gap="2" justify="end" align="center">
        <EditCandidateCaseDialog
          candidateCase={candidateCase}
          assignmentOptions={assignmentOptions}
        />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="ghost" color="gray" size="2">
              <DotsHorizontalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {candidateCase.status === "ARCHIVED" ? (
              <DropdownMenu.Item onClick={() => setIsRestoreAlertOpen(true)}>
                Restore Case
              </DropdownMenu.Item>
            ) : (
              <>
                <DropdownMenu.Item onClick={() => setIsRevokeAlertOpen(true)}>
                  Revoke Candidate Access
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  color="red"
                  onClick={() => setIsArchiveAlertOpen(true)}
                >
                  Archive Case
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>

      <CandidateCaseConfirmationDialog
        open={isRevokeAlertOpen}
        onOpenChange={setIsRevokeAlertOpen}
        title="Revoke Access"
        description={
          <>
            Are you sure you want to revoke the candidate's access to{" "}
            <strong>
              {candidateCase.workingRepository || "this repository"}
            </strong>
            ? They will no longer be able to push code or view the repository.
          </>
        }
        confirmLabel="Revoke Access"
        confirmColor="red"
        isLoading={isLoading}
        onConfirm={handleRevoke}
      />

      <CandidateCaseConfirmationDialog
        open={isRestoreAlertOpen}
        onOpenChange={setIsRestoreAlertOpen}
        title="Restore Candidate Case"
        description={
          <>
            Restore{" "}
            <strong>{candidateCase.workingRepository || "this case"}</strong>{" "}
            back into the active workflow. If the repository is still available,
            candidate access will be granted again automatically.
          </>
        }
        confirmLabel="Restore Case"
        confirmColor="blue"
        isLoading={isLoading}
        onConfirm={handleRestore}
      />

      <CandidateCaseConfirmationDialog
        open={isArchiveAlertOpen}
        onOpenChange={setIsArchiveAlertOpen}
        title="Archive Candidate Case"
        description={
          <>
            Are you sure you want to archive{" "}
            <strong>{candidateCase.workingRepository || "this case"}</strong>?
            This will revoke candidate access and hide the case from active
            views while keeping the repository details and evaluation history in
            the system for possible restoration later.
          </>
        }
        confirmLabel="Archive Case"
        confirmColor="red"
        isLoading={isLoading}
        onConfirm={handleArchive}
      />
    </>
  );
}
