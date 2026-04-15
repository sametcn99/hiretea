"use client";

import {
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { Box, Card, Flex, Text } from "@radix-ui/themes";
import { createContext, type PropsWithChildren, use, useState } from "react";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastAccent(tone: ToastTone) {
  switch (tone) {
    case "success":
      return "var(--green-9)";
    case "error":
      return "var(--red-9)";
    case "info":
      return "var(--blue-9)";
  }
}

function getToastIcon(tone: ToastTone) {
  switch (tone) {
    case "success":
      return <CheckCircledIcon width="16" height="16" />;
    case "error":
      return <CrossCircledIcon width="16" height="16" />;
    case "info":
      return <InfoCircledIcon width="16" height="16" />;
  }
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  function removeToast(id: string) {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }

  function showToast({ title, description, tone = "info" }: ToastInput) {
    const id = crypto.randomUUID();

    setToasts((currentToasts) => [
      ...currentToasts,
      { id, title, description, tone },
    ]);

    window.setTimeout(() => {
      removeToast(id);
    }, 3200);
  }

  return (
    <ToastContext value={{ showToast }}>
      {children}
      <Box
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 1000,
          width: "min(360px, calc(100vw - 32px))",
          pointerEvents: "none",
        }}
      >
        <Flex direction="column" gap="2" align="stretch">
          {toasts.map((toast) => (
            <Card
              key={toast.id}
              size="2"
              style={{
                pointerEvents: "auto",
                borderLeft: `3px solid ${getToastAccent(toast.tone)}`,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.24)",
              }}
            >
              <Flex align="start" gap="3">
                <Box
                  style={{ color: getToastAccent(toast.tone), flexShrink: 0 }}
                >
                  {getToastIcon(toast.tone)}
                </Box>
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">
                    {toast.title}
                  </Text>
                  {toast.description ? (
                    <Text size="1" color="gray">
                      {toast.description}
                    </Text>
                  ) : null}
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      </Box>
    </ToastContext>
  );
}

export function useToast() {
  const context = use(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
}
