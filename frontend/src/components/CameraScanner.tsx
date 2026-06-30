"use client"

import { useEffect, useRef, useCallback } from "react"
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/browser"

interface Props {
  onResult: (text: string) => void
  onClose: () => void
  label?: string
}

export function CameraScanner({ onResult, onClose, label = "Apunta la cámara al código" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  const stop = useCallback(() => {
    readerRef.current?.reset()
  }, [])

  useEffect(() => {
    if (!videoRef.current) return
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result) {
        stop()
        onResult(result.getText())
      }
      if (err && !(err instanceof NotFoundException)) {
        console.error(err)
      }
    })

    return () => stop()
  }, [onResult, stop])

  const handleClose = () => {
    stop()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 bg-black">
        <p className="text-sm text-white">{label}</p>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30"
        >
          Cancelar
        </button>
      </div>

      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Viewfinder */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-56 w-56 border-2 border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
    </div>
  )
}
