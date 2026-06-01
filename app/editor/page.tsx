export const dynamic = "force-dynamic"

import { getAllProjects } from "@/lib/projects"
import { EditorHomeClient } from "@/components/editor/editor-home-client"

export default async function EditorPage() {
  const projects = await getAllProjects()

  return (
    <EditorHomeClient
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  )
}
