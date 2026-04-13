import { DashboardOverview } from "@/app/(app)/dashboard/components/dashboard-overview";
import { requireAuthSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireAuthSession();

  return (
    <DashboardOverview
      displayName={session.user.name ?? session.user.email ?? "Team member"}
      role={session.user.role}
    />
  );
}
