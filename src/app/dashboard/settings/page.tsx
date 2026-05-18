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
      <AppNav activeHref="/dashboard/settings" />
      <main className="cr-frame-narrow pt-14 pb-24">
        <h1
          className="font-bold tracking-[-0.035em] leading-[1.05] mb-1.5"
          style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}
        >
          Settings
        </h1>
        <p className="text-sm text-(--color-text-dim) mb-10">
          Configure your location, notifications, and connected account.
        </p>
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
