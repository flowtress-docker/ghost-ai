import { randomUUID } from "node:crypto"
import { after } from "next/server"
import { getAuthUserId } from "@/lib/auth/session"
import { executeDesignAgent } from "@/lib/ai/execute-design-agent"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import type { designAgent } from "@/trigger/design-agent"

function useInlineDesignWorker() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.TRIGGER_DEV_WORKER !== "true"
  )
}

export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body: unknown = await request.json().catch(() => ({}))
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : ""
  const roomId = typeof b.roomId === "string" ? b.roomId.trim() : ""
  const projectId = typeof b.projectId === "string" ? b.projectId.trim() : ""

  if (!prompt || !roomId || !projectId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  const payload = { prompt, roomId, userId }

  if (useInlineDesignWorker()) {
    const runId = `inline_${randomUUID()}`
    await prisma.taskRun.create({
      data: { runId, projectId, userId },
    })

    after(async () => {
      try {
        await executeDesignAgent(payload)
      } catch (error) {
        console.error("[design-agent-inline]", error)
      }
    })

    return Response.json({ runId, inline: true }, { status: 201 })
  }

  const handle = await tasks.trigger<typeof designAgent>("design-agent", payload)

  await prisma.taskRun.create({
    data: { runId: handle.id, projectId, userId },
  })

  return Response.json({ runId: handle.id }, { status: 201 })
}
