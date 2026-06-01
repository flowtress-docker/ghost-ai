import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";
import {
  getDesignAgentErrorMessage,
  getGeminiModelCandidates,
  isRetryableModelError,
} from "@/lib/ai/design-agent-errors";
import { getGoogleAiApiKey } from "@/lib/env";
import { ensureCanvasRoom } from "@/lib/liveblocks/ensure-canvas-room";
import { getLiveblocks } from "@/lib/liveblocks";
import { NODE_COLORS, SHAPE_DEFAULTS, NODE_SHAPES } from "@/types/canvas";
import type { CanvasEdge, CanvasNode, NodeShape } from "@/types/canvas";

const AI_USER_ID = "ghost-ai";
const AI_USER_INFO = { name: "Ghost AI", avatar: "", color: "#6457f9" };

const DEFAULT_MARKER_END = {
  type: "arrowclosed" as const,
  color: "rgba(255,255,255,0.4)",
  width: 16,
  height: 16,
};

const COLOR_NAMES = ["neutral", "blue", "purple", "orange", "red", "pink", "green", "teal"];

function buildSystemPrompt(): string {
  const colorGuide = NODE_COLORS.map(
    (c, i) => `  ${i} (${COLOR_NAMES[i]}): fill=${c.fill} text=${c.text}`
  ).join("\n");

  return `You are Ghost AI, an expert system architect that generates technical architecture diagrams on a collaborative canvas.

ALLOWED SHAPES (use exact value):
- rectangle  → services, APIs, microservices, components
- cylinder   → databases, storage, caches
- hexagon    → external systems, third-party services, boundaries
- circle     → events, triggers, endpoints, user entry-points
- diamond    → decision gateways, conditionals
- pill       → processes, workflows, jobs

COLOR PALETTE (colorIndex 0-7):
${colorGuide}
Recommended mapping:
- 1 (blue)   → APIs, services, servers
- 7 (teal)   → databases, storage
- 3 (orange) → message queues, brokers, async flows
- 6 (green)  → success paths, healthy services, CDN
- 2 (purple) → auth, security, identity
- 5 (pink)   → user-facing UI, clients
- 0 (neutral)→ generic / unclassified

LAYOUT RULES:
- Start top-left at approximately x=100, y=80
- Horizontal gap between sibling nodes: 240-280px
- Vertical gap between rows: 160-200px
- Group related nodes in horizontal rows; use vertical rows for sequential flows
- Edge IDs must be unique, e.g. "edge-api-auth", "edge-1"
- Node IDs must be unique short slugs, e.g. "api-gateway", "user-db", "auth-service"

GENERATION RULES:
- Create 5-12 nodes; do not overcrowd
- Add edges to show data/request flow
- Prefer clear left→right or top→bottom flows
- When the canvas already has nodes, extend or modify instead of replacing unless asked

INSTRUCTIONS:
- Call addNode for each node you want to place on the canvas
- Call addEdge for each connection between nodes
- Call finalizeDesign last with a 1-2 sentence summary of what was designed`;
}

function clampColor(idx: number): number {
  return Math.min(Math.max(Math.round(idx ?? 0), 0), NODE_COLORS.length - 1);
}

const canvasTools = {
  addNode: tool({
    description: "Add a new node to the canvas",
    inputSchema: z.object({
      id: z.string().describe('Unique slug ID e.g. "api-gateway", "user-db"'),
      label: z.string().describe("Display label for the node"),
      shape: z.enum(NODE_SHAPES).describe("Node shape"),
      colorIndex: z.number().int().min(0).max(7).describe("Color palette index 0-7"),
      x: z.number().describe("X position in pixels"),
      y: z.number().describe("Y position in pixels"),
    }),
  }),
  moveNode: tool({
    description: "Move an existing node to a new position",
    inputSchema: z.object({
      id: z.string().describe("ID of the node to move"),
      x: z.number(),
      y: z.number(),
    }),
  }),
  resizeNode: tool({
    description: "Resize an existing node",
    inputSchema: z.object({
      id: z.string(),
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  }),
  updateNodeData: tool({
    description: "Update the label, shape, or color of an existing node",
    inputSchema: z.object({
      id: z.string(),
      label: z.string().optional(),
      shape: z.enum(NODE_SHAPES).optional(),
      colorIndex: z.number().int().min(0).max(7).optional(),
    }),
  }),
  deleteNode: tool({
    description: "Delete a node from the canvas",
    inputSchema: z.object({
      id: z.string(),
    }),
  }),
  addEdge: tool({
    description: "Add a directed edge between two nodes",
    inputSchema: z.object({
      id: z.string().describe('Unique edge ID e.g. "edge-api-db"'),
      source: z.string().describe("Source node ID"),
      target: z.string().describe("Target node ID"),
      label: z.string().optional().describe("Optional edge label"),
    }),
  }),
  deleteEdge: tool({
    description: "Delete an edge from the canvas",
    inputSchema: z.object({
      id: z.string(),
    }),
  }),
  finalizeDesign: tool({
    description: "Complete the design and provide a summary — call this last",
    inputSchema: z.object({
      summary: z.string().describe("1-2 sentence description of the designed architecture"),
    }),
  }),
};

type ToolName = keyof typeof canvasTools;
type ToolCall = { toolName: ToolName; input: Record<string, unknown> };

export type DesignAgentPayload = {
  prompt: string;
  roomId: string;
  userId: string;
};

async function generateDesignPlan(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  prompt: string,
  canvasContext: string
) {
  const models = getGeminiModelCandidates();
  let lastError: unknown;

  for (const modelId of models) {
    try {
      return await generateText({
        model: google(modelId),
        system: buildSystemPrompt(),
        prompt: `User request: ${prompt}\n\n${canvasContext}`,
        tools: canvasTools,
        toolChoice: "required",
      });
    } catch (error) {
      lastError = error;
      if (isRetryableModelError(error)) {
        console.warn(`[design-agent] ${modelId} unavailable, trying fallback model…`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export async function executeDesignAgent(payload: DesignAgentPayload) {
  const lb = getLiveblocks();
  const apiKey = getGoogleAiApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is required");
  }
  const google = createGoogleGenerativeAI({ apiKey });

  await ensureCanvasRoom(lb, payload.roomId);

  await lb
    .setPresence(payload.roomId, {
      userId: AI_USER_ID,
      data: { cursor: null, thinking: true },
      userInfo: AI_USER_INFO,
      ttl: 120_000,
    })
    .catch(() => {});

  await lb
    .broadcastEvent(payload.roomId, {
      type: "ai-status",
      message: "Ghost AI is analyzing your request…",
      status: "start",
    })
    .catch(() => {});

  try {
    let canvasContext = "The canvas is currently empty — create a fresh design.";
    try {
      const doc = await lb.getStorageDocument(payload.roomId, "json");
      const flow = (doc as Record<string, unknown>)?.flow as Record<string, unknown> | undefined;
      const nodeCount = flow?.nodes ? Object.keys(flow.nodes as object).length : 0;
      if (nodeCount > 0) {
        canvasContext = `Canvas has ${nodeCount} existing node(s). Current state:\n${JSON.stringify(flow, null, 2)}\nExtend or modify based on the request; only clear if explicitly asked.`;
      }
    } catch {
      // No storage yet — treat as empty
    }

    const result = await generateDesignPlan(google, payload.prompt, canvasContext);

    const toolCalls = result.steps.flatMap((s) => s.toolCalls) as ToolCall[];
    const actionCalls = toolCalls.filter((c) => c.toolName !== "finalizeDesign");
    const finalizeCall = toolCalls.find((c) => c.toolName === "finalizeDesign");
    const summary =
      (finalizeCall?.input as { summary?: string } | undefined)?.summary ??
      "Design applied to canvas.";

    const addCount = actionCalls.filter((c) => c.toolName === "addNode").length;
    await lb
      .broadcastEvent(payload.roomId, {
        type: "ai-status",
        message: `Placing ${addCount} node${addCount !== 1 ? "s" : ""} on the canvas…`,
        status: "thinking",
      })
      .catch(() => {});

    await lb.mutateStorage(payload.roomId, ({ root }) => {
      const flow = root.get("flow");
      if (!flow) {
        throw new Error(
          "Canvas storage is missing the flow object. Refresh the page and try again."
        );
      }
      const nodes = flow.get("nodes");
      const edges = flow.get("edges");

      for (const call of actionCalls) {
        applyToolCall(call, nodes, edges);
      }
    });

    await lb
      .broadcastEvent(payload.roomId, {
        type: "ai-status",
        message: summary,
        status: "complete",
      })
      .catch(() => {});

    return { success: true, actionsApplied: actionCalls.length, summary };
  } catch (error) {
    const message = getDesignAgentErrorMessage(error);
    console.error("[design-agent]", error);

    await lb
      .broadcastEvent(payload.roomId, {
        type: "ai-status",
        message,
        status: "error",
      })
      .catch(() => {});
    throw error;
  } finally {
    await lb
      .setPresence(payload.roomId, {
        userId: AI_USER_ID,
        data: { cursor: null, thinking: false },
        userInfo: AI_USER_INFO,
        ttl: 3_000,
      })
      .catch(() => {});
  }
}

type LiveNodeLike = { get(k: string): unknown; set(k: string, v: unknown): void };
type LiveMapLike = {
  get(id: string): unknown;
  set(id: string, value: unknown): void;
  delete(id: string): boolean;
};

function applyToolCall(call: ToolCall, nodes: LiveMapLike, edges: LiveMapLike) {
  const input = call.input;

  switch (call.toolName) {
    case "addNode": {
      const { id, label, shape, colorIndex, x, y } = input as {
        id: string;
        label: string;
        shape: NodeShape;
        colorIndex: number;
        x: number;
        y: number;
      };
      const ci = clampColor(colorIndex);
      const color = NODE_COLORS[ci];
      const size = SHAPE_DEFAULTS[shape] ?? SHAPE_DEFAULTS.rectangle;
      const node: CanvasNode = {
        id,
        type: "canvasNode",
        position: { x, y },
        data: { label, color: color.fill, textColor: color.text, shape },
        width: size.width,
        height: size.height,
      };
      nodes.set(id, node);
      break;
    }

    case "moveNode": {
      const { id, x, y } = input as { id: string; x: number; y: number };
      const n = nodes.get(id) as LiveNodeLike | undefined;
      if (n) n.set("position", { x, y });
      break;
    }

    case "resizeNode": {
      const { id, width, height } = input as { id: string; width: number; height: number };
      const n = nodes.get(id) as LiveNodeLike | undefined;
      if (n) {
        n.set("width", width);
        n.set("height", height);
      }
      break;
    }

    case "updateNodeData": {
      const { id, label, shape, colorIndex } = input as {
        id: string;
        label?: string;
        shape?: NodeShape;
        colorIndex?: number;
      };
      const n = nodes.get(id) as LiveNodeLike | undefined;
      if (!n) break;

      const data = n.get("data") as LiveNodeLike | Record<string, unknown> | undefined;
      const updates: Record<string, unknown> = {};
      if (label !== undefined) updates.label = label;
      if (shape !== undefined) updates.shape = shape;
      if (colorIndex !== undefined) {
        const ci = clampColor(colorIndex);
        updates.color = NODE_COLORS[ci].fill;
        updates.textColor = NODE_COLORS[ci].text;
      }

      if (data && typeof (data as LiveNodeLike).set === "function") {
        const liveData = data as LiveNodeLike;
        for (const [key, value] of Object.entries(updates)) {
          liveData.set(key, value);
        }
      } else {
        n.set("data", {
          ...(typeof data === "object" && data !== null ? data : {}),
          ...updates,
        });
      }
      break;
    }

    case "deleteNode": {
      const { id } = input as { id: string };
      nodes.delete(id);
      break;
    }

    case "addEdge": {
      const { id, source, target, label } = input as {
        id: string;
        source: string;
        target: string;
        label?: string;
      };
      const edge: CanvasEdge = {
        id,
        type: "canvasEdge",
        source,
        target,
        sourceHandle: null,
        targetHandle: null,
        data: { label: label ?? "" },
        markerEnd: DEFAULT_MARKER_END,
      };
      edges.set(id, edge);
      break;
    }

    case "deleteEdge": {
      const { id } = input as { id: string };
      edges.delete(id);
      break;
    }
  }
}
