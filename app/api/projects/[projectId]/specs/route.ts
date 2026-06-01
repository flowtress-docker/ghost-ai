import { prisma } from "@/lib/prisma"
import { getProjectById } from "@/lib/project-access"
import type { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await ctx.params
  const project = await getProjectById(projectId)
  if (!project) return Response.json({ error: "Not found" }, { status: 404 })

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, filePath: true, createdAt: true },
  })

  return Response.json(specs)
}
