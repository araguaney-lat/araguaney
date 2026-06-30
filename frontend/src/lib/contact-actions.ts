"use server"

import { z } from "zod"
import { Resend } from "resend"
import { verifyTurnstile } from "@/lib/turnstile"

const schema = z.object({
  nombre: z.string().min(2).max(100),
  organizacion: z.string().min(2).max(150),
  correo: z.string().email(),
  tipo: z.enum(["alta", "voluntario", "consulta"]),
  mensaje: z.string().min(10).max(2000),
  turnstileToken: z.string().min(1),
})

export type ContactResult = { ok: true } | { ok: false; error: string }

export async function submitContact(formData: unknown): Promise<ContactResult> {
  const parsed = schema.safeParse(formData)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa el formulario." }
  }

  const { nombre, organizacion, correo, tipo, mensaje, turnstileToken } = parsed.data

  const valid = await verifyTurnstile(turnstileToken)
  if (!valid) {
    return { ok: false, error: "Verificación de seguridad fallida. Intenta de nuevo." }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: "Servicio de correo no configurado." }
  }

  const tipoLabel: Record<string, string> = {
    alta: "Dar de alta un centro",
    voluntario: "Sumarme como voluntario",
    consulta: "Otra consulta",
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: "Araguaney Contacto <contacto@bioflow.io>",
    to: ["hola@araguaney.lat"],
    replyTo: correo,
    subject: `[Contacto] ${tipoLabel[tipo]} — ${organizacion}`,
    text: [
      `Nombre: ${nombre}`,
      `Organización: ${organizacion}`,
      `Correo: ${correo}`,
      `Tipo: ${tipoLabel[tipo]}`,
      "",
      mensaje,
    ].join("\n"),
  })

  if (error) {
    return { ok: false, error: "Error al enviar el correo. Intenta más tarde." }
  }

  return { ok: true }
}
