"use client";

import { useState } from "react";
import { AlertDialog, Button, DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { deleteCandidateAction } from "../actions";

type CandidateActionsProps = {
  candidateId: string;
  candidateName: string;
};

export function CandidateActions({ candidateId, candidateName }: CandidateActionsProps) {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteCandidateAction(candidateId);
    if (result.status === "error") {
      alert(result.message); // Should ideally use a toast, but this serves MVP
      setIsDeleting(false);
    } else {
      setIsDeleteAlertOpen(false);
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
          <DropdownMenu.Item
            color="red"
            onClick={() => setIsDeleteAlertOpen(true)}
          >
            Archive Candidate & Revoke Access
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <AlertDialog.Root open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Archive Candidate</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to archive <strong>{candidateName}</strong>? This action
            will delete their Gitea account and prevent them from logging in, but it will
            preserve their data and test submissions for record-keeping.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" disabled={isDeleting}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={handleDelete} loading={isDeleting}>
                Archive
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
