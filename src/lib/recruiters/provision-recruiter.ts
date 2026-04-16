import { randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/log";
import type { AuthorizedActor } from "@/lib/auth/authorization";
import { assertActorHasRole } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import {
  createRecruiterAccount,
  deleteCandidateAccount,
} from "@/lib/gitea/accounts";
import { ensureRecruiterTeamMembership } from "@/lib/gitea/teams";
import type { RecruiterProvisionInput } from "@/lib/recruiters/schemas";

type ProvisionRecruiterParams = RecruiterProvisionInput & AuthorizedActor;

function generateTemporaryPassword(length = 18) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function provisionRecruiter(input: ProvisionRecruiterParams) {
  assertActorHasRole(
    input,
    [UserRole.ADMIN],
    "provision recruiting team members",
  );

  const existingUser = await db.user.findFirst({
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

  if (existingUser) {
    throw new Error(
      "A user with the same email or Gitea username already exists.",
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const giteaAccount = await createRecruiterAccount({
    actorId: input.actorId,
    username: input.username,
    email: input.email,
    displayName: input.displayName,
    temporaryPassword,
  });

  try {
    await ensureRecruiterTeamMembership({
      actorId: input.actorId,
      username: input.username,
    });

    const recruiter = await db.user.create({
      data: {
        name: input.displayName,
        email: input.email,
        role: UserRole.RECRUITER,
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
      action: "recruiter.provision.completed",
      actorId: input.actorId,
      resourceType: "Recruiter",
      resourceId: recruiter.id,
      detail: {
        email: input.email,
        username: input.username,
      },
    });

    return {
      recruiter,
      temporaryPassword,
    };
  } catch (error) {
    await deleteCandidateAccount({
      actorId: input.actorId,
      username: input.username,
      reason: "recruiter.account.rollback",
    });

    throw error;
  }
}
