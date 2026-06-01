import { prisma } from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import type { SessionUser } from "@/lib/auth/types"

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function createUser(input: {
  email: string
  password: string
  name?: string
}) {
  const email = normalizeEmail(input.email)
  const passwordHash = await hashPassword(input.password)

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) return null

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  }
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
    },
  })
}

export async function getUsersByEmail(emails: string[]) {
  if (emails.length === 0) {
    return new Map<string, Awaited<ReturnType<typeof getUserById>>>()
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emails,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
    },
  })

  const map = new Map<string, (typeof users)[number]>()
  for (const user of users) {
    map.set(normalizeEmail(user.email), user)
  }
  return map
}

export function toSessionUser(user: {
  id: string
  email: string
  name: string | null
}): SessionUser {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
  }
}
