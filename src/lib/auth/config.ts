import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import { createGiteaProvider } from "@/lib/auth/providers/gitea";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getResolvedGiteaAuthConfig } from "@/lib/gitea/runtime-config";
import { ensureRecruiterTeamMembership } from "@/lib/gitea/teams";

function readGiteaLogin(profile: unknown) {
  if (!profile || typeof profile !== "object" || !("login" in profile)) {
    return null;
  }

  const login = profile.login;

  return typeof login === "string" && login.trim().length > 0 ? login : null;
}

async function getAuthProviders() {
  try {
    const authConfig = await getResolvedGiteaAuthConfig();

    return [
      createGiteaProvider({
        clientId: authConfig.clientId,
        clientSecret: authConfig.clientSecret,
        issuer: authConfig.issuer,
        internalBaseUrl: authConfig.internalBaseUrl,
      }),
    ];
  } catch {
    return [];
  }
}

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const providers = await getAuthProviders();

  return {
    adapter: PrismaAdapter(db),
    pages: {
      signIn: "/sign-in",
    },
    providers,
    secret: env.NEXTAUTH_SECRET,
    session: {
      strategy: "database",
    },
    callbacks: {
      async signIn({ user, profile }) {
        if (!user.email) {
          return false;
        }

        const existingUser = await db.user.findUnique({
          where: {
            email: user.email,
          },
          select: {
            id: true,
            isActive: true,
            role: true,
          },
        });

        if (!existingUser) {
          return false;
        }

        if (existingUser.role === UserRole.CANDIDATE) {
          return "/sign-in?error=candidate-access-denied";
        }

        const giteaLogin = readGiteaLogin(profile);

        if (
          existingUser.role === UserRole.ADMIN &&
          existingUser.isActive &&
          giteaLogin
        ) {
          await ensureRecruiterTeamMembership({
            actorId: existingUser.id,
            username: giteaLogin,
            audit: false,
          });
        }

        await db.giteaIdentity.updateMany({
          where: {
            userId: user.id,
            initialPassword: {
              not: null,
            },
          },
          data: {
            initialPassword: null,
          },
        });
        return existingUser.isActive;
      },
      async session({ session, user }) {
        if (!session.user) {
          return session;
        }

        session.user.id = user.id;
        session.user.role = user.role ?? "CANDIDATE";
        session.user.isActive = user.isActive ?? true;

        return session;
      },
    },
  };
}
