import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { createGiteaProvider } from "@/lib/auth/providers/gitea";
import { db } from "@/lib/db";
import { env, hasAuthConfiguration } from "@/lib/env";

const providers = (() => {
  if (!hasAuthConfiguration()) {
    return [];
  }

  const clientId = env.AUTH_GITEA_ID;
  const clientSecret = env.AUTH_GITEA_SECRET;
  const issuer = env.AUTH_GITEA_ISSUER;

  if (!clientId || !clientSecret || !issuer) {
    return [];
  }

  return [
    createGiteaProvider({
      clientId,
      clientSecret,
      issuer,
      internalBaseUrl: env.GITEA_ADMIN_BASE_URL ?? issuer,
    }),
  ];
})();

export const authOptions: NextAuthOptions = {
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
