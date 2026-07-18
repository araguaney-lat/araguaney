import Link from "next/link"

export interface Crumb {
  name: string
  path: string
}

interface BreadcrumbsProps {
  items: readonly Crumb[]
}

// Visible breadcrumb trail. Pass the SAME array to breadcrumbSchema() so the
// JSON-LD and the on-page trail stay in sync. The last item is the current
// page (not linked).
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Ruta de navegación"
      className="text-[12px] md:text-[12.5px]"
      style={{ color: "#8A8073" }}
    >
      <ol className="flex flex-wrap items-center gap-1.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" style={{ color: "#6E6557", fontWeight: 600 }}>
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.path} style={{ color: "#946A00", fontWeight: 600 }}>
                    {item.name}
                  </Link>
                  <span aria-hidden style={{ color: "#C8BCA5" }}>
                    /
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
