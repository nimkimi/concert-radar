"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ResyncArtistsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "error" } | { kind: "done"; count: number }
  >({ kind: "idle" });

  function resync() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await fetch("/api/sync-artists", { method: "POST" });
      if (!res.ok) {
        setStatus({ kind: "error" });
        return;
      }
      const body = (await res.json()) as { upserted: number };
      setStatus({ kind: "done", count: body.upserted });
      router.refresh();
    });
  }

  let label = "Re-sync from Spotify";
  if (pending) label = "Syncing…";
  else if (status.kind === "error") label = "Failed — retry";
  else if (status.kind === "done") label = `${status.count} synced`;

  return (
    <button
      type="button"
      onClick={resync}
      disabled={pending}
      className="cr-btn cr-btn--secondary"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      {label}
    </button>
  );
}
