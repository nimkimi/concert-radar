"use client";

import { useState } from "react";

export function ShareButton({
  title,
  text,
  className = "cr-btn cr-btn--ghost",
  style,
}: {
  title: string;
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title, text, url };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
        setStatus("shared");
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  let label = "↗ Share concert";
  if (status === "copied") label = "✓ Link copied";
  else if (status === "shared") label = "✓ Shared";

  return (
    <button type="button" onClick={share} className={className} style={style}>
      {label}
    </button>
  );
}
