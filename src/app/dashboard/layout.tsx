import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/nextauth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  return <>{children}</>;
}
