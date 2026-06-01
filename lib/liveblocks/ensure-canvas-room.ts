import { LiveMap, LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { LiveblocksError, type Liveblocks } from "@liveblocks/node";

function emptyCanvasStorage(): PlainLsonObject {
  return toPlainLson(
    new LiveObject({
      flow: new LiveObject({ nodes: new LiveMap(), edges: new LiveMap() }),
    })
  ) as PlainLsonObject;
}

/** Ensure the Liveblocks room exists and has the canvas `flow` storage root. */
export async function ensureCanvasRoom(lb: Liveblocks, roomId: string): Promise<void> {
  await lb.getOrCreateRoom(roomId, { defaultAccesses: [] });

  let hasFlow = false;
  try {
    const doc = await lb.getStorageDocument(roomId, "json");
    const flow = (doc as Record<string, unknown> | null)?.flow;
    hasFlow = flow !== null && typeof flow === "object";
  } catch {
    hasFlow = false;
  }

  if (hasFlow) return;

  try {
    await lb.initializeStorageDocument(roomId, emptyCanvasStorage());
  } catch (error) {
    if (error instanceof LiveblocksError && (error.status === 409 || error.status === 400)) {
      return;
    }
    throw error;
  }
}
