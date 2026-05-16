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
    setExcluded(next); // optimistic
    startTransition(async () => {
      const res = await fetch("/api/artists/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, isExcluded: next }),
      });
      if (!res.ok) setExcluded(!next); // revert
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={excluded}
      aria-label={excluded ? "Include in feed" : "Exclude from feed"}
      title={excluded ? "Include in feed" : "Exclude from feed"}
      className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center text-base transition-colors cursor-pointer"
      style={{
        background: excluded
          ? "var(--color-source-bandsintown)"
          : "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
    >
      {excluded ? "✕" : "✓"}
    </button>
  );
}
