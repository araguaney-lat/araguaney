import "./manual.css"

// The manual CSS is scoped to `.manual`, so importing it here (loaded only on
// /dashboard/ayuda routes) never affects the rest of the panel.
export default function AyudaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
