import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

type NavLink = { href: string; label: string };

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/artists", label: "Artists" },
  { href: "/dashboard/settings", label: "Settings" },
];

export type AppNavProps = {
  activeHref?: string;
  userName?: string;
};

export function AppNav({ activeHref }: AppNavProps) {
  return (
    <header className="cr-shell-header">
      <div className="cr-frame-wide flex items-center gap-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-[-0.01em]">
          <span className="w-[26px] h-[26px] rounded-lg bg-(--color-green) text-black grid place-items-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
          Concert Radar
        </Link>

        <nav className="flex gap-1 ml-6">
          {LINKS.map((l) => {
            const active = activeHref === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "px-3.5 py-2 text-sm font-medium rounded-lg text-(--color-text) bg-(--color-bg-subtle)"
                    : "px-3.5 py-2 text-sm font-medium rounded-lg text-(--color-text-soft) hover:text-(--color-text) transition-colors"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />
        <ThemeToggle />
      </div>
    </header>
  );
}
