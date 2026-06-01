import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export interface ProjectIdentity {
  userId: string | null
  primaryEmailAddress: string | null
}

export async function getCurrentProjectIdentity(): Promise<ProjectIdentity> {
  const session = await getSession()

  if (!session) {
    return {
      userId: null,
      primaryEmailAddress: null,
    }
  }

  return {
    userId: session.userId,
    primaryEmailAddress: session.email,
  }
}

export async function getAccessibleProject(
  projectId: string,
  identity: ProjectIdentity
) {
  if (!identity.userId) return null

  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: identity.primaryEmailAddress
        ? [
            { ownerId: identity.userId },
            {
              collaborators: {
                some: {
                  email: {
                    equals: identity.primaryEmailAddress,
                    mode: "insensitive",
                  },
                },
              },
            },
          ]
        : [{ ownerId: identity.userId }],
    },
  })
}

export async function userHasProjectAccess(
  projectId: string,
  identity: ProjectIdentity
) {
  const project = await getAccessibleProject(projectId, identity)
  return Boolean(project)
}
