import Link from "next/link"
import { localizedGroups } from "./manuals"
import { getLocale } from "@/lib/i18n"

const HEADER = {
  es: {
    eyebrow: "Ayuda",
    title: "Manual de Araguaney",
    lede:
      "Cómo funciona la app y cómo usar cada módulo, paso a paso. Empieza por " +
      "“Cómo funciona” para ver el flujo completo, o entra directo al módulo que necesites.",
  },
  en: {
    eyebrow: "Help",
    title: "Araguaney manual",
    lede:
      "How the app works and how to use each module, step by step. Start with " +
      "“How it works” for the full flow, or jump straight to the module you need.",
  },
} as const

export default async function AyudaIndexPage() {
  const locale = await getLocale()
  const h = HEADER[locale]
  const groups = localizedGroups(locale)

  return (
    <div className="manual">
      <div className="doc">
        <div className="wrap">
          <header>
            <span className="eyebrow">{h.eyebrow}</span>
            <h1>{h.title}</h1>
            <p className="lede">{h.lede}</p>
          </header>

          {groups.map((group) => (
            <section key={group.group}>
              <div className="sect-head">
                <h2>{group.group}</h2>
              </div>
              <div className="grid two">
                {group.items.map((item) => (
                  <Link key={item.slug} href={`/dashboard/ayuda/${item.slug}`} className="card" style={{ display: "block" }}>
                    <h3>{item.title}</h3>
                    <p>{item.blurb}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
