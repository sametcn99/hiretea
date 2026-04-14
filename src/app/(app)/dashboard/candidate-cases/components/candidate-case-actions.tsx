"use client";

import { useState } from "react";
import { AlertDialog, Button, DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { deleteCaseAction, revokeAccessAction } from "../actions";

type CandidateCaseActionsProps = {
  caseId: string;
  repositoryName: string;
};

export function CandidateCaseActions({ caseId, repositoryName }: CandidateCaseActionsProps) {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isRevokeAlertOpen, setIsRevokeAlertOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    const result = await deleteCaseAction(caseId);
    if (result.status === "error") {
      alert(result.message);
      setIsLoading(false);
    } else {
      setIsDeleteAlertOpen(false);
    }
  }

  async function handleRevoke() {
    setIsLoading(true);
    const result = await revokeAccessAction(caseId);
    if (result.status === "error") {
      alert(result.message);
      setIsLoading(false);
    } else {
      setIsRevokeAlertOpen(false);
      setIsLoading(false);
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton variant="ghost" color="gray" size="2">
            <DotsHorizontalIcon />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => setIsRevokeAlertOpen(true)}>
            Revoke Candidate Access
          </DropdownMenu.Item>
          <DropdownMenu.Item
            color="red"
            onClick={() => setIsDeleteAlertOpen(true)}
          >
            Delete Case
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Revoke Access Alert */}
      <AlertDialog.Root open={isRevokeAlertOpen} onOpenChange={setIsRevokeAlertOpen}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Revoke Access</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to revoke the candidate's access to{" "}
            <strong>{repositoryName}</strong>? They will no longer be able to push code or view the repository.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" disabled={isLoading}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={handleRevoke} loading={isLoading}>
                Revoke Access
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Delete Case Alert */}
      <AlertDialog.Root open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Delete Candidate Case</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to delete <strong>{repositoryName}</strong>? This action
            cannot be undone. It will delete the repository from Gitea and wipe all
            evaluation notes from the system.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" disabled={isLoading}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={handleDelete} loading={isLoading}>
                Delete Case
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
