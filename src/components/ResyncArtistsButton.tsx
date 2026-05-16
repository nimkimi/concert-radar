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

  let label = "⟳ Re-sync from Spotify";
  if (pending) label = "Syncing…";
  else if (status.kind === "error") label = "⟳ Failed — retry";
  else if (status.kind === "done") label = `⟳ ${status.count} artists synced`;

  return (
    <button
      type="button"
      onClick={resync}
      disabled={pending}
      className="cr-btn cr-btn--ghost"
    >
      {label}
    </button>
  );
}
