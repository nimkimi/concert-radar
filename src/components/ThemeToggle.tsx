"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function detect(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("cr-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ tone = "neutral" }: { tone?: "neutral" | "dark" }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(detect());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("cr-theme", next);
    } catch (_) {}
  }

  // tone="dark" is for placement over the landing hero (white-on-dark icons)
  const cls =
    tone === "dark"
      ? "w-9 h-9 rounded-full bg-white/6 hover:bg-white/12 border border-white/12 text-white flex items-center justify-center transition-colors"
      : "w-9 h-9 rounded-full bg-(--color-bg-elev) hover:bg-(--color-bg-subtle) border border-(--color-border) hover:border-(--color-border-strong) text-(--color-text) flex items-center justify-center transition-colors";

  // Render a placeholder until mounted so SSR + first paint don't disagree.
  const showSun = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cls}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title="Toggle theme"
    >
      {showSun ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
