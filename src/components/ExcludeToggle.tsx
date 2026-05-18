"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ExcludeToggle({
  artistId,
  initialExcluded,
}: {
  artistId: string;
  initialExcluded: boolean;
}) {
  const router = useRouter();
  const [excluded, setExcluded] = useState(initialExcluded);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !excluded;
    setExcluded(next);
    startTransition(async () => {
      const res = await fetch("/api/artists/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, isExcluded: next }),
      });
      if (!res.ok) setExcluded(!next);
      else router.refresh();
    });
  }

  const base =
    "w-7 h-7 rounded-full grid place-items-center cursor-pointer transition-all disabled:opacity-50";
  // When excluded, always visible in green to telegraph "this is hidden, click to unhide".
  // When not excluded, only revealed on the parent card's hover state.
  const variant = excluded
    ? "border border-(--color-green) text-(--color-green) bg-(--color-green-soft)"
    : "border border-(--color-border) text-(--color-text-dim) bg-(--color-bg-subtle) hover:border-(--color-border-strong) hover:text-(--color-text) opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={excluded}
      aria-label={excluded ? "Show this artist again" : "Hide this artist"}
      title={excluded ? "Show this artist again" : "Hide this artist"}
      className={`absolute top-3 right-3 z-10 ${base} ${variant}`}
    >
      {excluded ? (
        // Eye + circle = "visible/unhide me"
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        // Eye with slash = "hide"
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  );
}
