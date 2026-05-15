import { AppNav } from "@/components/AppNav";
import { auth } from "@/lib/auth/nextauth";

export default async function DashboardPlaceholder() {
  const session = await auth();
  return (
    <>
      <AppNav activeHref="/dashboard" userName={session?.user?.name ?? undefined} />
      <main className="cr-frame py-16">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-(--color-spotify) mb-3">
          Dashboard · placeholder
        </p>
        <h1
          className="font-black uppercase leading-[0.85] tracking-[-0.05em]"
          style={{ fontSize: "var(--text-display)" }}
        >
          Hello, <span className="text-(--color-spotify)">{session?.user?.name ?? "friend"}</span>.
        </h1>
        <p className="mt-6 text-(--color-text-muted) max-w-prose">
          Your concert feed lands here in issue #11. For now, this just proves you got past the OAuth gate.
        </p>
      </main>
    </>
  );
}
