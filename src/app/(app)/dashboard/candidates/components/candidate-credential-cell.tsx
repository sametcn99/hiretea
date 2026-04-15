"use client";

import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { Code, Flex, IconButton, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { StatusBadge } from "@/components/ui/status-badge";

type CandidateCredentialCellProps = {
  temporaryPassword: string | null;
  hasLinkedSignIn: boolean;
};

export function CandidateCredentialCell({
  temporaryPassword,
  hasLinkedSignIn,
}: CandidateCredentialCellProps) {
  const { showToast } = useToast();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  async function handleCopy() {
    if (!temporaryPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopyState("copied");
      showToast({
        tone: "success",
        title: "Temporary password copied",
        description: "The candidate credential is now in your clipboard.",
      });
    } catch {
      setCopyState("error");
      showToast({
        tone: "error",
        title: "Clipboard copy failed",
        description: "Copy the temporary password manually from the roster.",
      });
    }
  }

  if (temporaryPassword) {
    return (
      <Flex direction="column" gap="1">
        <Flex align="center" gap="2">
          <Text size="1" color="gray">
            Temporary password
          </Text>
          <IconButton
            size="1"
            variant="soft"
            color={copyState === "error" ? "red" : "gray"}
            onClick={handleCopy}
            aria-label="Copy temporary password"
            title={
              copyState === "copied"
                ? "Copied"
                : copyState === "error"
                  ? "Copy failed"
                  : "Copy temporary password"
            }
          >
            {copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </Flex>
        <Code size="2" style={{ wordBreak: "break-all" }}>
          {temporaryPassword}
        </Code>
      </Flex>
    );
  }

  if (hasLinkedSignIn) {
    return <StatusBadge label="Password Changed" tone="positive" />;
  }

  return (
    <Text size="2" color="gray">
      Temporary password unavailable.
    </Text>
  );
}
