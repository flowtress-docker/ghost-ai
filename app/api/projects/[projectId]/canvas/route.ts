import { prisma } from "@/lib/prisma"
import {
  getCanvasRelativePath,
  readArtifact,
  writeArtifact,
} from "@/lib/artifact-storage"
import { getCurrentProjectIdentity, userHasProjectAccess } from "@/lib/project-access"
import type { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/canvas">
) {
  const identity = await getCurrentProjectIdentity()
  if (!identity.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params
  const hasAccess = await userHasProjectAccess(projectId, identity)
  if (!hasAccess) return Response.json({ error: "Not found" }, { status: 404 })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasFilePath: true },
  })

  if (!project?.canvasFilePath) return Response.json({ canvas: null })

  const raw = await readArtifact(project.canvasFilePath)
  if (!raw) return Response.json({ canvas: null })

  const canvas: unknown = JSON.parse(raw)
  return Response.json({ canvas })
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/canvas">
) {
  const identity = await getCurrentProjectIdentity()
  if (!identity.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId } = await ctx.params
  const hasAccess = await userHasProjectAccess(projectId, identity)
  if (!hasAccess) return Response.json({ error: "Not found" }, { status: 404 })

  const body: unknown = await request.json().catch(() => ({}))
  const relativePath = getCanvasRelativePath(projectId)
  await writeArtifact(relativePath, JSON.stringify(body))

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasFilePath: relativePath },
  })

  return Response.json({ path: relativePath })
}
