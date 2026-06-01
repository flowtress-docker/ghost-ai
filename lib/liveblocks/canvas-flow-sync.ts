import { LiveObject } from "@liveblocks/core";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

/** Matches @liveblocks/react-flow NODE_BASE_CONFIG (default useLiveblocksFlow sync). */
export const CANVAS_NODE_SYNC_CONFIG = {
  selected: false,
  dragging: false,
  measured: false,
  resizing: false,
  position: "atomic" as const,
  sourcePosition: "atomic" as const,
  targetPosition: "atomic" as const,
  extent: "atomic" as const,
  origin: "atomic" as const,
  handles: "atomic" as const,
};

/** Matches @liveblocks/react-flow EDGE_BASE_CONFIG. */
export const CANVAS_EDGE_SYNC_CONFIG = {
  selected: false,
  markerStart: "atomic" as const,
  markerEnd: "atomic" as const,
  label: "atomic" as const,
  labelBgPadding: "atomic" as const,
};

type LiveStorageRecord = {
  get(key: string): unknown;
  setLocal?: (key: string, value: unknown) => void;
};

export function hasFlowLocalFields(value: unknown): value is LiveStorageRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LiveStorageRecord).get === "function" &&
    typeof (value as LiveStorageRecord).setLocal === "function"
  );
}

function readDataField(data: unknown): CanvasNode["data"] {
  if (data === null || typeof data !== "object") {
    return { label: "", color: "", textColor: "", shape: "rectangle" };
  }

  const record = data as LiveStorageRecord & CanvasNode["data"];
  if (typeof record.get === "function") {
    return {
      label: (record.get("label") as string) ?? "",
      color: (record.get("color") as string) ?? "",
      textColor: (record.get("textColor") as string) ?? "",
      shape: (record.get("shape") as CanvasNode["data"]["shape"]) ?? "rectangle",
    };
  }

  return {
    label: record.label ?? "",
    color: record.color ?? "",
    textColor: record.textColor ?? "",
    shape: record.shape ?? "rectangle",
  };
}

function readEdgeDataField(data: unknown): CanvasEdge["data"] {
  if (data === null || typeof data !== "object") {
    return { label: "" };
  }

  const record = data as LiveStorageRecord & CanvasEdge["data"];
  if (typeof record.get === "function") {
    return { label: (record.get("label") as string) ?? "" };
  }

  return { label: record.label ?? "" };
}

export function liveStorageToCanvasNode(node: LiveStorageRecord): CanvasNode {
  return {
    id: node.get("id") as string,
    type: (node.get("type") as CanvasNode["type"]) ?? "canvasNode",
    position: (node.get("position") as CanvasNode["position"]) ?? { x: 0, y: 0 },
    data: readDataField(node.get("data")),
    width: (node.get("width") as number) ?? 160,
    height: (node.get("height") as number) ?? 80,
  };
}

export function liveStorageToCanvasEdge(edge: LiveStorageRecord): CanvasEdge {
  return {
    id: edge.get("id") as string,
    type: (edge.get("type") as CanvasEdge["type"]) ?? "canvasEdge",
    source: edge.get("source") as string,
    target: edge.get("target") as string,
    sourceHandle: (edge.get("sourceHandle") as string | null) ?? null,
    targetHandle: (edge.get("targetHandle") as string | null) ?? null,
    data: readEdgeDataField(edge.get("data")),
    markerEnd: (edge.get("markerEnd") as CanvasEdge["markerEnd"]) ?? undefined,
  };
}

export function toLiveblocksCanvasNode(node: CanvasNode) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches @liveblocks/react-flow toLiveblocksInternalNode
  return LiveObject.from(node as any, CANVAS_NODE_SYNC_CONFIG as any);
}

export function toLiveblocksCanvasEdge(edge: CanvasEdge) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches @liveblocks/react-flow toLiveblocksInternalEdge
  return LiveObject.from(edge as any, CANVAS_EDGE_SYNC_CONFIG as any);
}

type FlowStorageMap = {
  forEach: (cb: (value: unknown, key: string) => void) => void;
  set: (id: string, value: unknown) => void;
};

export function normalizeFlowStorageMaps(nodesMap: unknown, edgesMap: unknown) {
  const nodes = nodesMap as FlowStorageMap;
  const edges = edgesMap as FlowStorageMap;
  nodes.forEach((node, id) => {
    if (!hasFlowLocalFields(node)) {
      const record = node as LiveStorageRecord;
      const plain =
        typeof record.get === "function"
          ? liveStorageToCanvasNode(record)
          : (node as CanvasNode);
      nodes.set(id, toLiveblocksCanvasNode(plain));
    }
  });

  edges.forEach((edge, id) => {
    if (!hasFlowLocalFields(edge)) {
      const record = edge as LiveStorageRecord;
      const plain =
        typeof record.get === "function"
          ? liveStorageToCanvasEdge(record)
          : (edge as CanvasEdge);
      edges.set(id, toLiveblocksCanvasEdge(plain));
    }
  });
}
