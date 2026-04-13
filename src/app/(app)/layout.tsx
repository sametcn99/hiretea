import type { ReactNode } from "react";
import { AppNavigation } from "@/app/(app)/components/app-navigation";
import styles from "@/app/(app)/layout.module.css";
import { AppLogo } from "@/components/ui/app-logo";
import { requireAuthSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireAuthSession();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <AppLogo subtitle="Operations workspace" />
        <AppNavigation role={session.user.role} />
      </aside>
      <main className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className="ht-kicker">Workspace</p>
            <h1 className={styles.headerTitle}>Dashboard</h1>
          </div>
          <div className={styles.userBox}>
            <span className={styles.userName}>
              {session.user.name ?? session.user.email}
            </span>
            <span className="ht-muted">{session.user.role.toLowerCase()}</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
