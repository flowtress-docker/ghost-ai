"use client";

import { useStatus } from "@liveblocks/react";

export function LiveblocksConnectionStatus() {
  const status = useStatus();

  if (status === "connected") return null;

  const message =
    status === "reconnecting" || status === "connecting"
      ? "Reconnecting to canvas…"
      : status === "disconnected"
        ? "Canvas offline — check your connection"
        : null;

  if (!message) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-border-subtle bg-bg-elevated/95 px-3 py-1 text-xs text-text-secondary shadow-sm backdrop-blur-sm"
    >
      {message}
    </div>
  );
}
