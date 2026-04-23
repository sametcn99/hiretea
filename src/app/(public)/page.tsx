import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getServerAuthSession();
  if (session?.user?.id && session.user.isActive) redirect("/dashboard");
  redirect("/sign-in");
}
