import type { Route } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SignInPanel } from "@/app/(auth)/sign-in/components/sign-in-panel";
import styles from "@/app/(auth)/sign-in/page.module.css";
import { getBootstrapStatus } from "@/lib/bootstrap/status";
import { getServerAuthSession } from "@/lib/auth/session";
import { hasAuthConfiguration } from "@/lib/env";

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

  const isConfigured = hasAuthConfiguration();

  return (
    <div className={styles.page}>
      <div className={styles.panelWrap}>
        <SignInPanel isConfigured={isConfigured} />
      </div>
    </div>
  );
}
