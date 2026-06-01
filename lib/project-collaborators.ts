import { prisma } from "@/lib/prisma"
import { getUserById, getUsersByEmail, normalizeEmail } from "@/lib/auth/users"
import { getAccessibleProject, type ProjectIdentity } from "@/lib/project-access"

export interface ProjectSharePerson {
  email: string | null
  displayName: string
  avatarUrl: string | null
  role: "owner" | "collaborator"
}

export interface ProjectShareDetails {
  projectId: string
  projectName: string
  canManage: boolean
  owner: ProjectSharePerson
  collaborators: ProjectSharePerson[]
}

export function normalizeCollaboratorEmail(email: string) {
  return normalizeEmail(email)
}

export function isValidCollaboratorEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getUserDisplayName(
  user: { name: string | null; email: string } | null,
  fallback?: string | null
) {
  if (!user) {
    return fallback ?? "Unknown user"
  }

  return user.name?.trim() || fallback || user.email
}

export async function getProjectShareDetails(
  projectId: string,
  identity: ProjectIdentity
): Promise<ProjectShareDetails | null> {
  const accessibleProject = await getAccessibleProject(projectId, identity)

  if (!accessibleProject) {
    return null
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      collaborators: {
        select: {
          email: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })

  if (!project) {
    return null
  }

  const collaboratorEmails = project.collaborators.map((collaborator) =>
    normalizeCollaboratorEmail(collaborator.email)
  )

  const [ownerUser, collaboratorUsersByEmail] = await Promise.all([
    getUserById(project.ownerId),
    getUsersByEmail(collaboratorEmails),
  ])

  const ownerEmail =
    ownerUser?.email ??
    (identity.userId === project.ownerId ? identity.primaryEmailAddress : null)

  return {
    projectId: project.id,
    projectName: project.name,
    canManage: identity.userId === project.ownerId,
    owner: {
      email: ownerEmail,
      displayName: getUserDisplayName(ownerUser, ownerEmail ?? "Project owner"),
      avatarUrl: ownerUser?.avatarUrl ?? null,
      role: "owner",
    },
    collaborators: collaboratorEmails.map((email) => {
      const user = collaboratorUsersByEmail.get(email) ?? null

      return {
        email,
        displayName: getUserDisplayName(user, email),
        avatarUrl: user?.avatarUrl ?? null,
        role: "collaborator" as const,
      }
    }),
  }
}
