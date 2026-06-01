import { getLiveblocks, getUserColor } from "@/lib/liveblocks"
import { getProjectById } from "@/lib/project-access"

const LOCAL_USER_ID = "local-user"

export async function POST(request: Request) {
  const { room } = await request.json()

  if (!room || typeof room !== "string") {
    return new Response("Bad Request", { status: 400 })
  }

  const project = await getProjectById(room)
  if (!project) {
    return new Response("Not Found", { status: 404 })
  }

  const lb = getLiveblocks()
  await lb.getOrCreateRoom(room, { defaultAccesses: [] })

  const session = lb.prepareSession(LOCAL_USER_ID, {
    userInfo: {
      name: "You",
      avatar: "",
      color: getUserColor(LOCAL_USER_ID),
    },
  })

  session.allow(room, session.FULL_ACCESS)

  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
