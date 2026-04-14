import { randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import type { CandidateProvisionInput } from "@/lib/candidates/schemas";
import { db } from "@/lib/db";
import {
  createCandidateAccount,
  deleteCandidateAccount,
} from "@/lib/gitea/accounts";

type ProvisionCandidateParams = CandidateProvisionInput & {
  actorId: string;
};

function generateTemporaryPassword(length = 18) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function provisionCandidate(input: ProvisionCandidateParams) {
  const existingCandidate = await db.user.findFirst({
    where: {
      OR: [
        {
          email: input.email,
        },
        {
          giteaIdentity: {
            is: {
              login: input.username,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existingCandidate) {
    throw new Error(
      "A candidate with the same email or Gitea username already exists.",
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const giteaAccount = await createCandidateAccount({
    actorId: input.actorId,
    username: input.username,
    email: input.email,
    displayName: input.displayName,
    temporaryPassword,
  });

  try {
    const candidate = await db.user.create({
      data: {
        name: input.displayName,
        email: input.email,
        role: UserRole.CANDIDATE,
        isActive: true,
        giteaIdentity: {
          create: {
            giteaUserId: giteaAccount.id,
            login: giteaAccount.login,
            email: giteaAccount.email ?? input.email,
            initialPassword: temporaryPassword,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        giteaIdentity: {
          select: {
            login: true,
          },
        },
      },
    });

    await createAuditLog({
      action: "candidate.provision.completed",
      actorId: input.actorId,
      resourceType: "Candidate",
      resourceId: candidate.id,
      detail: {
        email: input.email,
        username: input.username,
      },
    });

    return {
      candidate,
      temporaryPassword,
    };
  } catch (error) {
    await deleteCandidateAccount({
      actorId: input.actorId,
      username: input.username,
      reason: "candidate.account.rollback",
    });

    throw error;
  }
}
