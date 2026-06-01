/** Session-cookie auth for LiveblocksProvider (same-origin, stops retry on hard failures). */
export async function liveblocksAuthEndpoint(room?: string) {
  const response = await fetch("/api/liveblocks-auth", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room }),
  });

  const body: unknown = await response.json().catch(() => ({}));
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  if (!response.ok) {
    const reason =
      typeof record.error === "string"
        ? record.error
        : `Liveblocks auth failed (${response.status})`;
    return { error: "forbidden" as const, reason };
  }

  if (typeof record.token === "string") {
    return { token: record.token };
  }

  return { error: "forbidden" as const, reason: "Liveblocks auth returned an invalid token." };
}
