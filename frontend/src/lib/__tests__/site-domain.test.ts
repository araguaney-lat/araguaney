import { afterEach, describe, expect, it, vi } from "vitest"

// El dominio que lee una persona (pies de página, direcciones de contacto,
// llms.txt) sale de NEXT_PUBLIC_SITE_URL, la misma variable que ya fija los
// canónicos y el sitemap. Mudar el producto de dominio (Fase 29) es cambiar esa
// variable en Vercel, no buscar y reemplazar texto.

async function loadWith(siteUrl: string) {
  vi.resetModules()
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl)
  const seo = await import("@/lib/seo")
  const llms = await import("@/content/llms")
  return { ...seo, ...llms }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("site domain", () => {
  it("drops the www prefix and the scheme", async () => {
    const { SITE_DOMAIN } = await loadWith("https://www.ejemplo.test/")
    expect(SITE_DOMAIN).toBe("ejemplo.test")
  })

  it("builds contact addresses on that domain", async () => {
    const { contactEmail } = await loadWith("https://www.ejemplo.test")
    expect(contactEmail("hola")).toBe("hola@ejemplo.test")
  })

  it("keeps the old domain out of llms.txt", async () => {
    const { llmsTxt, llmsFullTxt } = await loadWith("https://www.ejemplo.test")
    for (const body of [llmsTxt(), llmsFullTxt()]) {
      expect(body).toContain("https://www.ejemplo.test/")
      expect(body).not.toContain("araguaney.lat")
    }
  })
})
