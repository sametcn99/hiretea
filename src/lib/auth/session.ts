import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { cache } from "react";
import { authOptions } from "@/lib/auth/config";
import { hasAnyRole } from "@/lib/permissions/roles";

export const getServerAuthSession = cache(() => getServerSession(authOptions));

export async function requireAuthSession() {
  const session = await getServerAuthSession();

  if (!session?.user?.id || !session.user.isActive) {
    redirect("/sign-in");
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
