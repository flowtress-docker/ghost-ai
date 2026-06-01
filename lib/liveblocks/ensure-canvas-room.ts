import { LiveMap, LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { LiveblocksError, type Liveblocks } from "@liveblocks/node";
import { normalizeFlowStorageMaps } from "@/lib/liveblocks/canvas-flow-sync";

const CANVAS_FORMAT_KEY = "canvasFormat";
const CANVAS_FORMAT_VALUE = "react-flow-sync";

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

/**
 * Prepare canvas storage before the browser opens a WebSocket.
 * Normalizing while connected causes code 1006 reconnects; doing it here avoids that.
 */
export async function ensureNormalizedCanvasRoom(lb: Liveblocks, roomId: string): Promise<void> {
  await ensureCanvasRoom(lb, roomId);

  const room = await lb.getRoom(roomId);
  if (room.metadata?.[CANVAS_FORMAT_KEY] === CANVAS_FORMAT_VALUE) {
    return;
  }

  await lb.mutateStorage(roomId, ({ root }) => {
    const flow = root.get("flow");
    if (!flow) return;
    normalizeFlowStorageMaps(flow.get("nodes"), flow.get("edges"));
  });

  await lb.updateRoom(roomId, {
    metadata: {
      ...room.metadata,
      [CANVAS_FORMAT_KEY]: CANVAS_FORMAT_VALUE,
    },
  });
}
