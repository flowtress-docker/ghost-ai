import { getUserById } from "@/lib/auth/users";
import {
  getLiveblocks,
  getLiveblocksConfigError,
  getUserColor,
} from "@/lib/liveblocks";
import { ensureNormalizedCanvasRoom } from "@/lib/liveblocks/ensure-canvas-room";
import {
  getCurrentProjectIdentity,
  userHasProjectAccess,
} from "@/lib/project-access";

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity();

  if (!identity.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const configError = getLiveblocksConfigError();
  if (configError) {
    console.error("[liveblocks-auth]", configError);
    return Response.json({ error: configError }, { status: 503 });
  }

  let room: string;
  try {
    const body = await request.json();
    room = body?.room;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!room || typeof room !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const hasAccess = await userHasProjectAccess(room, identity);

  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const lb = getLiveblocks();

    await ensureNormalizedCanvasRoom(lb, room);

    const user = await getUserById(identity.userId);
    const name = user?.name ?? user?.email ?? "Anonymous";
    const avatar = user?.avatarUrl ?? "";
    const color = getUserColor(identity.userId);

    const session = lb.prepareSession(identity.userId, {
      userInfo: { name, avatar, color },
    });

    session.allow(room, session.FULL_ACCESS);

    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (error) {
    console.error("[liveblocks-auth]", error);
    const message =
      error instanceof Error ? error.message : "Liveblocks authentication failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
