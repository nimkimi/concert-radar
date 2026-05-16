import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { SettingsForm } from "@/components/SettingsForm";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      cityName: true,
      latitude: true,
      longitude: true,
      radiusKm: true,
      notificationsEnabled: true,
      notificationFrequency: true,
      name: true,
      email: true,
    },
  });
  if (!user) redirect("/");

  return (
    <>
      <AppNav activeHref="/dashboard/settings" userName={user.name ?? undefined} />
      <main className="cr-frame">
        <header className="pt-14 pb-10">
          <h1
            className="font-black uppercase leading-[0.88] tracking-[-0.05em]"
            style={{ fontSize: "var(--text-display)" }}
          >
            <span className="text-(--color-spotify)">Settings</span>
          </h1>
        </header>
        <SettingsForm
          initial={{
            cityName: user.cityName,
            latitude: user.latitude,
            longitude: user.longitude,
            radiusKm: user.radiusKm,
            notificationsEnabled: user.notificationsEnabled,
            notificationFrequency: user.notificationFrequency,
            displayName: user.name,
            email: user.email,
          }}
        />
      </main>
    </>
  );
}
