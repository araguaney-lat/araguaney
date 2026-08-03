"use client"

import { useState } from "react"

import {
  cancelManagedDonation,
  confirmPhoto,
  deletePhoto,
  getPhotoUploadUrl,
  getPhotoUrl,
  updateManagedItems,
  type ManagedDonation as Donation,
  type ManagedPhoto,
} from "@/lib/donation-actions"

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"]
const MAX_FOTO_BYTES = 5 * 1024 * 1024
const MAX_FOTOS = 5

interface Row {
  key: string
  free_text: string
  quantity: string
  unit: string
}

const toRows = (d: Donation): Row[] =>
  d.items.map((i) => ({
    key: i.id ?? crypto.randomUUID(),
    free_text: i.free_text ?? "",
    quantity: String(i.quantity),
    unit: i.unit,
  }))

export default function ManageDonation({
  token,
  donation,
}: {
  token: string
  donation: Donation
}) {
  const [rows, setRows] = useState<Row[]>(toRows(donation))
  const [photos, setPhotos] = useState<ManagedPhoto[]>(donation.photos ?? [])
  const [status, setStatus] = useState(donation.status)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  // Desde que el centro la recibe manda su inventario: aquí solo se lee.
  const editable = status === "REGISTERED"

  const setRow = (key: string, field: keyof Row, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)
    const items = rows
      .filter((r) => r.free_text.trim() && r.unit.trim())
      .map((r) => ({
        free_text: r.free_text.trim(),
        quantity: parseInt(r.quantity, 10) || 1,
        unit: r.unit.trim(),
      }))

    const result = await updateManagedItems(token, items)
    setSaving(false)
    if (result.ok) setMessage("Guardamos los cambios.")
    else setError(result.error)
  }

  async function cancel() {
    setSaving(true)
    const result = await cancelManagedDonation(token)
    setSaving(false)
    if (result.ok) {
      setStatus("CANCELLED")
      setMessage("Cancelamos tu donación. Gracias de todas formas.")
    } else {
      setError(result.error)
    }
  }

  async function upload(file: File) {
    setError(null)
    if (!TIPOS_FOTO.includes(file.type)) {
      setError("Solo aceptamos fotos JPEG, PNG o WebP.")
      return
    }
    if (file.size > MAX_FOTO_BYTES) {
      setError("Cada photo puede pesar hasta 5 MB.")
      return
    }

    setUploading(true)
    // Tres pasos: pedir la URL firmada, subir directo al almacenamiento y
    // avisarle al backend. La photo nunca pasa por nuestro servidor.
    const target = await getPhotoUploadUrl(token, file.type, file.size)
    if (target === null) {
      setUploading(false)
      setError("No pudimos preparar la subida. Inténtalo de nuevo.")
      return
    }

    try {
      const put = await fetch(target.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!put.ok) throw new Error("upload failed")
    } catch {
      setUploading(false)
      setError("No pudimos subir la photo. Revisa tu conexión e inténtalo de nuevo.")
      return
    }

    const photo = await confirmPhoto(token, target.storage_key, file.type, file.size)
    setUploading(false)
    if (photo === null) setError("La photo se subió pero no pudimos registrarla. Inténtalo de nuevo.")
    else setPhotos((ps) => [...ps, photo])
  }

  async function ver(photoId: string) {
    const url = await getPhotoUrl(token, photoId)
    if (url) window.open(url, "_blank", "noopener,noreferrer")
  }

  async function quitar(photoId: string) {
    if (await deletePhoto(token, photoId)) {
      setPhotos((ps) => ps.filter((p) => p.id !== photoId))
    } else {
      setError("No pudimos borrar la photo.")
    }
  }

  const input =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-zinc-50 disabled:text-zinc-500"

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tu donación</p>
        <h1 className="font-mono text-2xl font-bold text-zinc-900">{donation.code}</h1>
        {!editable && (
          <p className="mt-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
            {status === "CANCELLED"
              ? "Esta donación está cancelada."
              : "El centro ya recibió esta donación, así que aquí solo puedes consultarla."}
          </p>
        )}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-900">Qué vas a donar</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Escríbelo como lo dirías. En el centro verifican lo que traes contra esta lista.
        </p>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-12 gap-2">
              <input
                className={`${input} col-span-12 sm:col-span-6`}
                value={r.free_text}
                disabled={!editable}
                onChange={(e) => setRow(r.key, "free_text", e.target.value)}
              />
              <input
                className={`${input} col-span-4 sm:col-span-2`}
                type="number"
                min={1}
                value={r.quantity}
                disabled={!editable}
                onChange={(e) => setRow(r.key, "quantity", e.target.value)}
              />
              <input
                className={`${input} col-span-5 sm:col-span-3`}
                value={r.unit}
                disabled={!editable}
                onChange={(e) => setRow(r.key, "unit", e.target.value)}
              />
              {editable && rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  className="col-span-3 text-xs text-zinc-400 hover:text-zinc-700 sm:col-span-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {editable && (
          <button
            type="button"
            onClick={() =>
              setRows((rs) => [...rs, { key: crypto.randomUUID(), free_text: "", quantity: "1", unit: "" }])
            }
            className="mt-3 text-sm text-amber-700 hover:underline"
          >
            + Agregar otro
          </button>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-900">Fotos (opcional)</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Ayudan al centro a saber qué esperar. No se publican: solo las ve el centro que
          recibe tu donación. Hasta {MAX_FOTOS}, de 5 MB cada una.
        </p>

        {photos.length > 0 && (
          <ul className="mb-3 space-y-2">
            {photos.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <span className="text-zinc-700">Foto {i + 1}</span>
                <span className="flex gap-3">
                  <button type="button" onClick={() => ver(p.id)} className="text-amber-700 hover:underline">
                    Ver
                  </button>
                  {editable && (
                    <button type="button" onClick={() => quitar(p.id)} className="text-zinc-400 hover:text-zinc-700">
                      Quitar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {editable && photos.length < MAX_FOTOS && (
          <label className="inline-block cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
            {uploading ? "Subiendo…" : "Agregar una photo"}
            <input
              type="file"
              accept={TIPOS_FOTO.join(",")}
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ""          // permite volver a elegir la misma
                if (file) upload(file)
              }}
            />
          </label>
        )}
      </section>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {editable && (
        <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-6">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-amber-950 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>

          {confirmingCancel ? (
            <span className="flex items-center gap-3 text-sm">
              <span className="text-zinc-600">¿Seguro? Esto no se puede deshacer.</span>
              <button type="button" onClick={cancel} disabled={saving} className="font-medium text-red-700 hover:underline">
                Sí, cancelar
              </button>
              <button type="button" onClick={() => setConfirmingCancel(false)} className="text-zinc-500 hover:underline">
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="text-sm text-zinc-500 hover:text-red-700 hover:underline"
            >
              Cancelar mi donación
            </button>
          )}
        </div>
      )}
    </div>
  )
}
