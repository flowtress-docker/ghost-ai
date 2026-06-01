"use client"

import { LiveObject, LiveMap } from "@liveblocks/client"
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react"
import { useCallback, useRef, useState } from "react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas/canvas-room"
import { useProjectActions, type ProjectRow } from "@/hooks/use-project-actions"
import type { CanvasTemplate } from "@/components/editor/starter-templates"

interface EditorWorkspaceClientProps {
  currentProject: ProjectRow
  projects: ProjectRow[]
  roomId: string
}

export function EditorWorkspaceClient({
  currentProject,
  projects,
  roomId,
}: EditorWorkspaceClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<CanvasTemplate | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const saveFnRef = useRef<() => void>(() => {})
  const actions = useProjectActions()

  const handleSaveStatusChange = useCallback((status: SaveStatus) => setSaveStatus(status), [])
  const handleSaveReady = useCallback((fn: () => void) => {
    saveFnRef.current = fn
  }, [])

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
        initialStorage={new LiveObject({
          flow: new LiveObject({ nodes: new LiveMap(), edges: new LiveMap() }),
        })}
      >
        <div className="flex h-screen flex-col bg-bg-base">
          <EditorNavbar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
            projectName={currentProject.name}
            isAiSidebarOpen={aiSidebarOpen}
            onToggleAiSidebar={() => setAiSidebarOpen((prev) => !prev)}
            onOpenTemplates={() => setTemplatesOpen(true)}
            saveStatus={saveStatus}
            onSave={() => saveFnRef.current()}
          />

          <main className="relative min-h-0 flex-1 overflow-hidden">
            <CanvasRoom
              projectId={currentProject.id}
              pendingTemplate={pendingTemplate}
              onTemplateImported={() => setPendingTemplate(null)}
              onSaveStatusChange={handleSaveStatusChange}
              onSaveReady={handleSaveReady}
            />
          </main>

          <ProjectSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            projects={projects}
            onNewProject={actions.openCreate}
            onRename={actions.openRename}
            onDelete={actions.openDelete}
            activeProjectId={currentProject.id}
          />

          <AiSidebar
            isOpen={aiSidebarOpen}
            onClose={() => setAiSidebarOpen(false)}
            roomId={roomId}
            projectId={currentProject.id}
          />

          <ProjectDialogs {...actions} />
          <StarterTemplatesModal
            open={templatesOpen}
            onOpenChange={setTemplatesOpen}
            onImport={(template) => setPendingTemplate(template)}
          />
        </div>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
