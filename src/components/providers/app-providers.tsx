"use client";

import { Theme } from "@radix-ui/themes";
import { SessionProvider } from "next-auth/react";
import type { PropsWithChildren } from "react";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <Theme
      appearance="dark"
      accentColor="blue"
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
      <SessionProvider>{children}</SessionProvider>
    </Theme>
  );
}
