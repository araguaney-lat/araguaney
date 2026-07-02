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

  const data = (await res.json()) as { success: boolean }
  return data.success
}
