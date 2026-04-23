import type { ReactNode } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

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
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      confirmColor={confirmColor}
      isLoading={isLoading}
      onConfirm={onConfirm}
    />
  );
}
