import { prisma } from "@/lib/prisma"

export async function getProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
  })
}
