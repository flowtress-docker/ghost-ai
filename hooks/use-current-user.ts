"use client"

import { useEffect, useState } from "react"

export interface CurrentUser {
  id: string
  email: string
  name: string | null
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me")
        const data = (await response.json()) as { user: CurrentUser | null }
        if (!cancelled) {
          setUser(data.user)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  return { user, loading }
}
