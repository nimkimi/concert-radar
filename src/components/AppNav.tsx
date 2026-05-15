import Link from "next/link";

type NavLink = { href: string; label: string };

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Concerts" },
  { href: "/dashboard/artists", label: "Artists" },
  { href: "/dashboard/settings", label: "Settings" },
];

export type AppNavProps = {
  activeHref?: string;
  userName?: string;
};

export function AppNav({ activeHref, userName }: AppNavProps) {
  return (
    <nav className="cr-nav">
      <Link href="/dashboard" className="cr-nav__brand">CONCERT RADAR</Link>
      <div className="cr-nav__links">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`cr-nav__link${activeHref === l.href ? " cr-nav__link--active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="cr-nav__user">
        {userName && <span className="text-[13px] text-(--color-text-muted)">{userName}</span>}
        <div className="cr-nav__avatar" aria-hidden />
      </div>
    </nav>
  );
}
