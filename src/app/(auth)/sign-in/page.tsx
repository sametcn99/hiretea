import { Box } from "@radix-ui/themes";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SignInPanel } from "@/app/(auth)/sign-in/components/sign-in-panel";
import { getServerAuthSession } from "@/lib/auth/session";
import { getBootstrapStatus } from "@/lib/bootstrap/status";
import { getGiteaRuntimeReadiness } from "@/lib/gitea/runtime-config";

export default async function SignInPage() {
  await connection();

  const bootstrapStatus = await getBootstrapStatus();

  if (bootstrapStatus.requiresSetup) {
    redirect("/setup" as Route);
  }

  const session = await getServerAuthSession();

  if (session?.user?.id && session.user.isActive) {
    redirect("/dashboard" as Route);
  }

  const runtimeReadiness = await getGiteaRuntimeReadiness();

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
        <SignInPanel isConfigured={runtimeReadiness.authReady} />
      </Box>
    </Box>
  );
}
