import Link from "next/link"
import { MANUAL_GROUPS } from "./manuals"

export default function AyudaIndexPage() {
  return (
    <div className="manual">
      <div className="doc">
        <div className="wrap">
          <header>
            <span className="eyebrow">Ayuda</span>
            <h1>Manual de Araguaney</h1>
            <p className="lede">
              Cómo funciona la app y cómo usar cada módulo, paso a paso. Empieza por
              &ldquo;Cómo funciona&rdquo; para ver el flujo completo, o entra directo al módulo
              que necesites.
            </p>
          </header>

          {MANUAL_GROUPS.map((group) => (
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
