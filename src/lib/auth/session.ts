import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/config";
import { hasAnyRole } from "@/lib/permissions/roles";

export async function getServerAuthSession() {
  return getServerSession(await getAuthOptions());
}

export async function requireAuthSession() {
  const session = await getServerAuthSession();

  if (!session?.user?.id || !session.user.isActive) {
    redirect("/sign-in");
  }

  if (session.user.role === "CANDIDATE") {
    redirect("/");
  }

  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireAuthSession();

  if (!hasAnyRole(session.user.role, roles)) {
    redirect("/");
  }

  return session;
}
