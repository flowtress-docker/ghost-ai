"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useStorage } from "@liveblocks/react";
import { normalizeFlowStorageMaps } from "@/lib/liveblocks/canvas-flow-sync";

const FLOW_STORAGE_KEY = "flow";

/**
 * Re-wraps legacy/plain Liveblocks nodes so @liveblocks/react-flow can call setLocal
 * for dragging, selection, and measured dimensions.
 */
export function useNormalizeCanvasFlowStorage() {
  const flowExists = useStorage((root) => root.flow !== undefined);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  const normalize = useMutation(({ storage }) => {
    const flow = storage.get(FLOW_STORAGE_KEY);
    if (!flow) return;
    normalizeFlowStorageMaps(flow.get("nodes"), flow.get("edges"));
  }, []);

  useEffect(() => {
    if (!flowExists || startedRef.current) return;
    startedRef.current = true;
    normalize();
    setReady(true);
  }, [flowExists, normalize]);

  return flowExists ? ready : false;
}
