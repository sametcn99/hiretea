"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  AlertDialog,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
} from "@radix-ui/themes";
import { useState } from "react";
import type {
  CandidateCaseAssignmentOptions,
  CandidateCaseListItem,
} from "@/lib/candidate-cases/queries";
import {
  deleteCaseAction,
  restoreCaseAction,
  revokeAccessAction,
} from "../actions";
import { EditCandidateCaseDialog } from "./edit-candidate-case-dialog";

type CandidateCaseActionsProps = {
  candidateCase: CandidateCaseListItem;
  assignmentOptions: CandidateCaseAssignmentOptions;
};

export function CandidateCaseActions({
  candidateCase,
  assignmentOptions,
}: CandidateCaseActionsProps) {
  const [isArchiveAlertOpen, setIsArchiveAlertOpen] = useState(false);
  const [isRevokeAlertOpen, setIsRevokeAlertOpen] = useState(false);
  const [isRestoreAlertOpen, setIsRestoreAlertOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleArchive() {
    setIsLoading(true);
    const result = await deleteCaseAction(candidateCase.id);
    if (result.status === "error") {
      alert(result.message);
      setIsLoading(false);
    } else {
      setIsArchiveAlertOpen(false);
      setIsLoading(false);
    }
  }

  async function handleRevoke() {
    setIsLoading(true);
    const result = await revokeAccessAction(candidateCase.id);
    if (result.status === "error") {
      alert(result.message);
      setIsLoading(false);
    } else {
      setIsRevokeAlertOpen(false);
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    setIsLoading(true);
    const result = await restoreCaseAction(candidateCase.id);
    if (result.status === "error") {
      alert(result.message);
      setIsLoading(false);
    } else {
      setIsRestoreAlertOpen(false);
      setIsLoading(false);
    }
  }

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

      {/* Revoke Access Alert */}
      <AlertDialog.Root
        open={isRevokeAlertOpen}
        onOpenChange={setIsRevokeAlertOpen}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Revoke Access</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to revoke the candidate's access to{" "}
            <strong>
              {candidateCase.workingRepository || "this repository"}
            </strong>
            ? They will no longer be able to push code or view the repository.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" disabled={isLoading}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                onClick={handleRevoke}
                loading={isLoading}
              >
                Revoke Access
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Restore Case Alert */}
      <AlertDialog.Root
        open={isRestoreAlertOpen}
        onOpenChange={setIsRestoreAlertOpen}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Restore Candidate Case</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Restore{" "}
            <strong>{candidateCase.workingRepository || "this case"}</strong>{" "}
            back into the active workflow. If the repository is still available,
            candidate access will be granted again automatically.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" disabled={isLoading}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="blue"
                onClick={handleRestore}
                loading={isLoading}
              >
                Restore Case
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Archive Case Alert */}
      <AlertDialog.Root
        open={isArchiveAlertOpen}
        onOpenChange={setIsArchiveAlertOpen}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Archive Candidate Case</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to archive{" "}
            <strong>{candidateCase.workingRepository || "this case"}</strong>?
            This will revoke candidate access and hide the case from active
            views while keeping the repository details and evaluation history in
            the system for possible restoration later.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" disabled={isLoading}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                onClick={handleArchive}
                loading={isLoading}
              >
                Archive Case
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
