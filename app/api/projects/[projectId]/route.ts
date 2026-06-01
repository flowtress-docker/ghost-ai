import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]">
) {
  const { projectId } = await ctx.params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return Response.json({ error: "Not found" }, { status: 404 })

  const body: unknown = await request.json().catch(() => ({}))
  const name =
    typeof body === "object" && body !== null && "name" in body && typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : undefined

  if (!name) return Response.json({ error: "name is required" }, { status: 400 })

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  })

  return Response.json({ project: updated })
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]">
) {
  const { projectId } = await ctx.params

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.project.delete({ where: { id: projectId } })

  return new Response(null, { status: 204 })
}
