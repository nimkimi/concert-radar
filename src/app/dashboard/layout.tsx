import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/nextauth";
import { MobileTabBar } from "@/components/MobileTabBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    // Bottom padding leaves room for the fixed MobileTabBar on phones; on
    // md+ the tab bar is hidden so padding collapses to 0.
    <div className="pb-24 md:pb-0">
      {children}
      <MobileTabBar />
    </div>
  );
}
