"use client";

import { Theme } from "@radix-ui/themes";
import { SessionProvider } from "next-auth/react";
import type { PropsWithChildren } from "react";
import { ToastProvider } from "@/components/providers/toast-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <Theme
      appearance="dark"
      accentColor="blue"
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </Theme>
  );
}
