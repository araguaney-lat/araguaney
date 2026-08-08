"use client" // Los error boundaries deben ser Client Components.

import { useEffect } from "react"

// Último recurso: se activa cuando falla el propio root layout, así que
// reemplaza el documento entero y debe traer sus etiquetas <html>/<body>. No
// hereda los estilos globales de la aplicación, por eso los estilos van en
// línea y no con clases de Tailwind.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Algo salió mal</h1>
        <p style={{ maxWidth: "28rem", fontSize: "0.875rem", color: "#525252" }}>
          Ocurrió un error inesperado. Puede ser temporal; vuelve a intentarlo.
        </p>
        <button
          onClick={() => retry()}
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#1d4ed8",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  )
}
