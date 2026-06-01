export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { EditorWorkspaceClient } from "@/components/editor/editor-workspace-client"
import { getAllProjects } from "@/lib/projects"
import { getProjectById } from "@/lib/project-access"

export default async function EditorWorkspacePage(
  props: PageProps<"/editor/[roomId]">
) {
  const { roomId } = await props.params
  const project = await getProjectById(roomId)

  if (!project) {
    notFound()
  }

  const projects = await getAllProjects()

  return (
    <EditorWorkspaceClient
      currentProject={{ id: project.id, name: project.name }}
      projects={projects.map((item) => ({ id: item.id, name: item.name }))}
      roomId={roomId}
    />
  )
}
