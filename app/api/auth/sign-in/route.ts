import {
  authenticateUser,
  isValidEmail,
  toSessionUser,
} from "@/lib/auth/users"
import { createSessionToken, setSessionCookie } from "@/lib/auth/session"

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => ({}))
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {}

  const email = typeof record.email === "string" ? record.email : ""
  const password = typeof record.password === "string" ? record.password : ""

  if (!isValidEmail(email)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 })
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  const user = await authenticateUser(email, password)
  if (!user) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 })
  }

  const sessionUser = toSessionUser(user)
  const token = await createSessionToken(sessionUser)
  await setSessionCookie(token)

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })
}
