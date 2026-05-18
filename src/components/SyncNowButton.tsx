"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SyncNowButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "rate"; retryAfterSec: number } | { kind: "error" } | { kind: "done"; count: number }
  >({ kind: "idle" });

  function sync() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await fetch("/api/sync-now", { method: "POST" });
      if (res.status === 429) {
        const body = (await res.json()) as { retryAfterSec: number };
        setStatus({ kind: "rate", retryAfterSec: body.retryAfterSec });
        return;
      }
      if (!res.ok) {
        setStatus({ kind: "error" });
        return;
      }
      const body = (await res.json()) as { newConcerts: number };
      setStatus({ kind: "done", count: body.newConcerts });
      router.refresh();
    });
  }

  let label = "⟳ Sync now";
  if (pending) label = "Syncing…";
  else if (status.kind === "rate") label = `Try again in ${Math.ceil(status.retryAfterSec / 60)}m`;
  else if (status.kind === "error") label = "Failed — retry";
  else if (status.kind === "done") label = status.count === 0 ? "No new shows" : `+${status.count} new`;

  return (
    <button
      type="button"
      onClick={sync}
      disabled={pending || status.kind === "rate"}
      className="text-(--color-text) hover:text-(--color-green) text-[13px] font-medium pl-2.5 ml-1 border-l border-(--color-border) disabled:opacity-60 transition-colors"
    >
      {label}
    </button>
  );
}
