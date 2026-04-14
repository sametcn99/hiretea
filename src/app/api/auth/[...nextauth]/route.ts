import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth/config";

export async function GET(request: Request, context: unknown) {
  const handler = NextAuth(await getAuthOptions());

  return handler(request, context as never);
}

export async function POST(request: Request, context: unknown) {
  const handler = NextAuth(await getAuthOptions());

  return handler(request, context as never);
}
