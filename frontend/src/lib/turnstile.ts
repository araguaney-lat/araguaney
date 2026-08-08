export async function verifyTurnstile(token: string): Promise<boolean> {
  // .trim() guards against a trailing newline in the env var value (a common
  // paste artifact in dashboard UIs) — Cloudflare's siteverify rejects a
  // secret with stray whitespace.
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY not configured")

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  })

  const data = (await res.json()) as { success: boolean; "error-codes"?: string[] }
  if (!data.success) {
    // Cloudflare dice POR QUÉ rechaza en error-codes; sin esto, un secreto mal
    // emparejado, un token vencido y un hostname no permitido se ven idénticos
    // (todos "no pudimos verificar"). Se registra para poder distinguirlos:
    //   invalid-input-secret  → el secreto no corresponde al site key del widget
    //   invalid-input-response → el token no corresponde a ese site key (o build viejo)
    //   timeout-or-duplicate  → token vencido o ya usado
    console.warn("Turnstile verification failed:", data["error-codes"] ?? [])
  }
  return data.success
}
