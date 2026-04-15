import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { createGiteaProvider } from "@/lib/auth/providers/gitea";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getResolvedGiteaAuthConfig } from "@/lib/gitea/runtime-config";

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
      async signIn({ user }) {
        if (!user.email) {
          return false;
        }

        const existingUser = await db.user.findUnique({
          where: {
            email: user.email,
          },
          select: {
            isActive: true,
          },
        });

        if (!existingUser) {
          return false;
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
