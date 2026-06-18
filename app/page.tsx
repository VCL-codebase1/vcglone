import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { roleHome } from "@/lib/routes";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  redirect(session?.user?.role ? roleHome(session.user.role) : "/login");
}


