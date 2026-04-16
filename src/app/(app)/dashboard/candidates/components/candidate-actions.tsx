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
import { useToast } from "@/components/providers/toast-provider";
import {
  deleteCandidateAction,
  issueCandidateInviteAction,
  revokeCandidateInviteAction,
} from "../actions";

type CandidateActionsProps = {
  candidateId: string;
  candidateName: string;
  hasLinkedSignIn: boolean;
  inviteStatus: "PENDING" | "CLAIMED" | "REVOKED" | "EXPIRED" | null;
};

export function CandidateActions({
  candidateId,
  candidateName,
  hasLinkedSignIn,
  inviteStatus,
}: CandidateActionsProps) {
  const { showToast } = useToast();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState<
    "issue" | "revoke" | "delete" | null
  >(null);

  async function handleIssueInvite() {
    setIsLoadingAction("issue");

    const result = await issueCandidateInviteAction(candidateId);

    if (result.status === "error") {
      showToast({
        tone: "error",
        title: "Invite generation failed",
        description: result.message,
      });
      setIsLoadingAction(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      showToast({
        tone: "success",
        title:
          result.issueKind === "RESEND" ? "Invite resent" : "Invite generated",
        description:
          result.issueKind === "RESEND"
            ? `${candidateName} now has resend #${result.resendSequence} recorded and copied to your clipboard.`
            : `${candidateName} now has an auditable onboarding invite copied to your clipboard.`,
      });
    } catch {
      showToast({
        tone: "error",
        title:
          result.issueKind === "RESEND"
            ? "Invite resent but clipboard copy failed"
            : "Invite generated but clipboard copy failed",
        description:
          "Generate the link again after checking clipboard permissions.",
      });
    }

    setIsLoadingAction(null);
  }

  async function handleRevokeInvite() {
    setIsLoadingAction("revoke");

    const result = await revokeCandidateInviteAction(candidateId);

    if (result.status === "error") {
      showToast({
        tone: "error",
        title: "Invite revoke failed",
        description: result.message,
      });
      setIsLoadingAction(null);
      return;
    }

    showToast({
      tone: "success",
      title: "Invite revoked",
      description: `${candidateName}'s active onboarding invite was revoked.`,
    });
    setIsLoadingAction(null);
  }

  async function handleDelete() {
    setIsLoadingAction("delete");
    const result = await deleteCandidateAction(candidateId);
    if (result.status === "error") {
      showToast({
        tone: "error",
        title: "Candidate archive failed",
        description: result.message,
      });
      setIsLoadingAction(null);
    } else {
      showToast({
        tone: "success",
        title: "Candidate archived",
        description: `${candidateName} was archived successfully.`,
      });
      setIsDeleteAlertOpen(false);
      setIsLoadingAction(null);
    }
  }

  return (
    <>
      <Flex align="center" gap="2" justify="end">
        {!hasLinkedSignIn ? (
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            disabled={isLoadingAction !== null}
            loading={isLoadingAction === "issue"}
            onClick={handleIssueInvite}
          >
            Copy onboarding invite
          </Button>
        ) : null}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="ghost" color="gray" size="2">
              <DotsHorizontalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {!hasLinkedSignIn && inviteStatus === "PENDING" ? (
              <DropdownMenu.Item
                disabled={isLoadingAction !== null}
                onClick={handleRevokeInvite}
              >
                Revoke active invite
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Item
              color="red"
              disabled={isLoadingAction !== null}
              onClick={() => setIsDeleteAlertOpen(true)}
            >
              Archive Candidate & Revoke Access
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>

      <AlertDialog.Root
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Archive Candidate</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to archive <strong>{candidateName}</strong>?
            This action will delete their Gitea account and prevent them from
            logging in, but it will preserve their data and test submissions for
            record-keeping.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button
                variant="soft"
                color="gray"
                disabled={isLoadingAction !== null}
              >
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                onClick={handleDelete}
                loading={isLoadingAction === "delete"}
              >
                Archive
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}
