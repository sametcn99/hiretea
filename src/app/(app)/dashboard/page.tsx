import { DashboardOverview } from "@/app/(app)/dashboard/components/dashboard-overview";
import { requireAuthSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const session = await requireAuthSession();
  const summary = await getDashboardSummary(session.user.role, session.user.id);

  return (
    <DashboardOverview
      displayName={session.user.name ?? session.user.email ?? "Team member"}
      role={session.user.role}
      summary={summary}
    />
  );
}
