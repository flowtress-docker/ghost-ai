import { prisma } from "@/lib/prisma"
import { readArtifact } from "@/lib/artifact-storage"
import { getCurrentProjectIdentity, userHasProjectAccess } from "@/lib/project-access"
import type { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ projectId: string; specId: string }> }
) {
  const identity = await getCurrentProjectIdentity()
  if (!identity.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId, specId } = await ctx.params

  const hasAccess = await userHasProjectAccess(projectId, identity)
  if (!hasAccess) return Response.json({ error: "Not found" }, { status: 404 })

  const spec = await prisma.projectSpec.findFirst({
    where: { id: specId, projectId },
  })
  if (!spec) return Response.json({ error: "Not found" }, { status: 404 })

  const content = await readArtifact(spec.filePath)
  if (!content) {
    return Response.json({ error: "File not found" }, { status: 404 })
  }

  return new Response(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
