"use client"

import Link from "next/link"
import { X, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/hooks/use-project-actions"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  projects: ProjectRow[]
  onNewProject: () => void
  onRename: (project: ProjectRow) => void
  onDelete: (project: ProjectRow) => void
  activeProjectId?: string
}

export function ProjectSidebar({
  isOpen,
  onClose,
  projects,
  onNewProject,
  onRename,
  onDelete,
  activeProjectId,
}: ProjectSidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-bg-base/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-3 left-3 top-[3.75rem] z-50 flex w-72 flex-col rounded-2xl border border-border-subtle bg-bg-surface/95 backdrop-blur-xl transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-default px-4">
          <span className="text-sm font-medium text-text-primary">Projects</span>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden p-3">
          <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-text-muted">No projects yet.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {projects.map((project) => (
                  <li key={project.id}>
                    <ProjectItem
                      project={project}
                      active={project.id === activeProjectId}
                      onRename={onRename}
                      onDelete={onDelete}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border-default p-3">
          <Button variant="default" size="default" className="w-full gap-2" onClick={onNewProject}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}

function ProjectItem({
  project,
  active,
  onRename,
  onDelete,
}: {
  project: ProjectRow
  active: boolean
  onRename: (project: ProjectRow) => void
  onDelete: (project: ProjectRow) => void
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg px-2 py-1.5",
        active ? "bg-bg-elevated" : "hover:bg-bg-elevated/60"
      )}
    >
      <Link
        href={`/editor/${project.id}`}
        className="min-w-0 flex-1 truncate text-sm text-text-primary"
      >
        {project.name}
      </Link>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRename(project)}
          aria-label={`Rename ${project.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(project)}
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
