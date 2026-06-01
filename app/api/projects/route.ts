import { prisma } from "@/lib/prisma"

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ projects })
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => ({}))
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  const name = typeof b.name === "string" ? (b.name.trim() || "Untitled Project") : "Untitled Project"
  const id = typeof b.id === "string" && b.id.trim() ? b.id.trim() : undefined

  const project = await prisma.project.create({
    data: { ...(id ? { id } : {}), name },
  })

  return Response.json({ project }, { status: 201 })
}
