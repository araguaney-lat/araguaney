"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"

export type StartExportResult = { ok: true; jobId: string } | { ok: false; error: string }
export type PollExportResult =
  | { ok: true; status: string; downloadUrl: string | null; jobError: string | null }
  | { ok: false; error: string }

// Generic pair used by every async export (shipment manifest, box labels,
// pallet label, transfer manifest, report CSV) — see Fase 12 tarea 15c.
// `path` is the POST endpoint that creates the job (e.g. "/v1/shipments/{id}/manifest.pdf").

export async function startExportJobAction(path: string): Promise<StartExportResult> {
  const session = await auth()
  if (!session?.accessToken) return { ok: false, error: "No autenticado" }

  try {
    const result = await apiFetch<{ id: string }>(path, {
      method: "POST",
      token: session.accessToken,
    })
    return { ok: true, jobId: result.id }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al iniciar la exportación" }
  }
}

export async function pollExportJobAction(jobId: string): Promise<PollExportResult> {
  const session = await auth()
  if (!session?.accessToken) return { ok: false, error: "No autenticado" }

  try {
    const result = await apiFetch<{ status: string; download_url: string | null; error: string | null }>(
      `/v1/exports/${jobId}`,
      { token: session.accessToken }
    )
    return { ok: true, status: result.status, downloadUrl: result.download_url, jobError: result.error }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al consultar el estado" }
  }
}
