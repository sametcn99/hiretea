import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import type { ReactNode } from "react";

type CandidateCaseConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmColor: "blue" | "red";
  isLoading: boolean;
  onConfirm: () => void;
};

export function CandidateCaseConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmColor,
  isLoading,
  onConfirm,
}: CandidateCaseConfirmationDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {description}
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
              color={confirmColor}
              onClick={onConfirm}
              loading={isLoading}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
