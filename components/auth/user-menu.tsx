"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  return email.slice(0, 2).toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  if (!user) {
    return null
  }

  const label = user.name?.trim() || user.email
  const initials = getInitials(user.name, user.email)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await fetch("/api/auth/sign-out", { method: "POST" })
      router.push("/sign-in")
      router.refresh()
    } finally {
      setSigningOut(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-xs font-semibold text-bg-base ring-1 ring-white/20"
        aria-label="Open account menu"
        title={label}
      >
        {initials}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-10 z-50 min-w-48 rounded-xl border border-border-default bg-bg-elevated p-2 shadow-lg">
            <div className="px-2 py-2">
              <p className="truncate text-sm font-medium text-text-primary">
                {label}
              </p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
