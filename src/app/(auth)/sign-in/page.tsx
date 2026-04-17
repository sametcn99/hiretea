import { Box } from "@radix-ui/themes";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SignInPanel } from "@/app/(auth)/sign-in/components/sign-in-panel";
import { getServerAuthSession } from "@/lib/auth/session";
import { getBootstrapStatus } from "@/lib/bootstrap/status";
import {
  getGiteaRuntimeConfig,
  getGiteaRuntimeReadiness,
} from "@/lib/gitea/runtime-config";

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  await connection();

  const bootstrapStatus = await getBootstrapStatus();

  if (bootstrapStatus.requiresSetup) {
    redirect("/setup" as Route);
  }

  const session = await getServerAuthSession();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [runtimeReadiness, runtimeConfig] = await Promise.all([
    getGiteaRuntimeReadiness(),
    getGiteaRuntimeConfig(),
  ]);

  return (
    <Box
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <Box style={{ width: "min(100%, 460px)" }}>
        <SignInPanel
          isConfigured={runtimeReadiness.authReady}
          error={resolvedSearchParams?.error}
          giteaBaseUrl={runtimeConfig.publicBaseUrl}
          currentUser={
            session?.user?.id && session.user.isActive
              ? {
                  email: session.user.email,
                  name: session.user.name,
                  role: session.user.role,
                  continuePath:
                    session.user.role === "CANDIDATE"
                      ? ("/" as Route)
                      : ("/dashboard" as Route),
                }
              : undefined
          }
        />
      </Box>
    </Box>
  );
}
