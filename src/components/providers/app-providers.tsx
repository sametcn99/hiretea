"use client";

import { SessionProvider } from "next-auth/react";
import type { PropsWithChildren } from "react";

export function AppProviders({ children }: PropsWithChildren) {
  return <SessionProvider>{children}</SessionProvider>;
}
