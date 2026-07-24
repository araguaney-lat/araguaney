"use client"

import { useEffect, useState } from "react"

export function ConnectivityBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener("online", up)
    window.addEventListener("offline", down)
    return () => {
      window.removeEventListener("online", up)
      window.removeEventListener("offline", down)
    }
  }, [])

  if (online) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dSealB bg-dSealB px-3 py-2 text-xs text-dSealT">
        <span className="h-2 w-2 rounded-full bg-dSealT" />
        Con conexión — lookups externos activos
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dDraftB bg-dDraftB px-3 py-2 text-xs text-dDraftT">
      <span className="h-2 w-2 rounded-full bg-dDraftT" />
      Sin conexión — solo puedes usar productos del catálogo existente
    </div>
  )
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener("online", up)
    window.addEventListener("offline", down)
    return () => {
      window.removeEventListener("online", up)
      window.removeEventListener("offline", down)
    }
  }, [])

  return online
}
