import {
  authenticateUser,
  createUser,
  isValidEmail,
  toSessionUser,
} from "@/lib/auth/users"
import {
  createSessionToken,
  getSession,
  setSessionCookie,
} from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ user: null })
  }

  return Response.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
    },
  })
}
