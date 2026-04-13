"use client";

import { signIn } from "next-auth/react";
import { startTransition, useState } from "react";
import styles from "@/app/(auth)/sign-in/page.module.css";
import { AppLogo } from "@/components/ui/app-logo";
import { StatusBadge } from "@/components/ui/status-badge";

type SignInPanelProps = {
  isConfigured: boolean;
};

export function SignInPanel({ isConfigured }: SignInPanelProps) {
  const [isPending, setIsPending] = useState(false);

  const handleSignIn = () => {
    setIsPending(true);

    startTransition(() => {
      void signIn("gitea", { callbackUrl: "/dashboard" }).finally(() => {
        setIsPending(false);
      });
    });
  };

  return (
    <section className={`ui segment ht-surface-card ${styles.panel}`}>
      <AppLogo subtitle="Authenticate against your company Gitea server" />

      <div className={styles.meta}>
        <div>
          <p className="ht-kicker">Access control</p>
          <h1 className={styles.title}>Sign in with your Gitea identity</h1>
        </div>
        <p className={styles.copy}>
          The platform relies on your self-hosted Gitea instance for
          authentication. Local application roles still control what each
          signed-in user can manage once they enter the workspace.
        </p>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span>OAuth configuration</span>
          <StatusBadge
            label={isConfigured ? "Ready" : "Missing"}
            tone={isConfigured ? "positive" : "warning"}
          />
        </div>
        <div className={styles.detailRow}>
          <span>Invitation model</span>
          <StatusBadge label="Manual for MVP" tone="neutral" />
        </div>
      </div>

      <button
        className={`ui fluid primary button ${isPending ? "loading disabled" : ""}`}
        disabled={!isConfigured || isPending}
        onClick={handleSignIn}
        type="button"
      >
        Continue with Gitea
      </button>

      {!isConfigured ? (
        <p className="ht-muted" style={{ margin: 0 }}>
          Add the Gitea OAuth environment variables before testing the full
          authentication flow.
        </p>
      ) : null}
    </section>
  );
}
