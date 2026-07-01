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
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Con conexión — lookups externos activos
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
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
