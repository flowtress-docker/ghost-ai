import { prisma } from "@/lib/prisma"

export async function getAllProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  })
}
