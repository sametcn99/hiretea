import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";

export type CandidateListItem = {
  id: string;
  displayName: string;
  email: string;
  giteaLogin: string | null;
  initialPassword: string | null;
  caseCount: number;
  hasLinkedSignIn: boolean;
  isActive: boolean;
  createdAt: Date;
};

export async function listCandidates() {
  const users = await db.user.findMany({
    where: {
      role: UserRole.CANDIDATE,
    },
    include: {
      giteaIdentity: {
        select: {
          login: true,
          initialPassword: true,
        },
      },
      _count: {
        select: {
          accounts: true,
          candidateCases: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map<CandidateListItem>((user) => ({
    id: user.id,
    displayName: user.name ?? "Unnamed candidate",
    email: user.email ?? "No email",
    giteaLogin: user.giteaIdentity?.login ?? null,
    initialPassword: user.giteaIdentity?.initialPassword ?? null,
    caseCount: user._count.candidateCases,
    hasLinkedSignIn: user._count.accounts > 0,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }));
}
