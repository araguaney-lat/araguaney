"use server"

import { z } from "zod"
import nodemailer from "nodemailer"

const schema = z.object({
  nombre: z.string().min(2).max(100),
  organizacion: z.string().min(2).max(150),
  correo: z.string().email(),
  tipo: z.enum(["alta", "voluntario", "consulta"]),
  mensaje: z.string().min(10).max(2000),
  turnstileToken: z.string().min(1),
})

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY not configured")

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  })

  const data = await res.json() as { success: boolean }
  return data.success
}

function createTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not configured")

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  })
}

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

  const tipoLabel: Record<string, string> = {
    alta: "Dar de alta un centro",
    voluntario: "Sumarme como voluntario",
    consulta: "Otra consulta",
  }

  try {
    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"Araguaney Contacto" <${process.env.GMAIL_USER}>`,
      to: "hola@araguaney.lat",
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
  } catch {
    return { ok: false, error: "Error al enviar el correo. Intenta más tarde." }
  }

  return { ok: true }
}
