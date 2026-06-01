import { Liveblocks } from "@liveblocks/node";

const CURSOR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i)) % CURSOR_COLORS.length;
  }
  return CURSOR_COLORS[hash];
}

export function getLiveblocksConfigError(): string | null {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY?.trim();

  if (!secret) {
    return "LIVEBLOCKS_SECRET_KEY is not set. Add your Liveblocks secret key (sk_…) to Cursor project secrets or .env.local, then restart the dev server.";
  }

  if (!secret.startsWith("sk_")) {
    return "LIVEBLOCKS_SECRET_KEY is invalid. Secret keys must start with sk_ (from https://liveblocks.io/dashboard/apikeys).";
  }

  return null;
}

export function isLiveblocksConfigured(): boolean {
  return getLiveblocksConfigError() === null;
}

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined;
};

export function getLiveblocks(): Liveblocks {
  const configError = getLiveblocksConfigError();
  if (configError) {
    throw new Error(configError);
  }

  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!.trim(),
    });
  }
  return globalForLiveblocks.liveblocks;
}
