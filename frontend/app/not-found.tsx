import Link from "next/link"

// 404 de toda la aplicación. Se muestra cuando una ruta no existe o cuando un
// segmento llama a notFound(). Texto en español: es el idioma por defecto y
// esta página se renderiza sin el proveedor de diccionario garantizado.
export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-[var(--blue)]">404</p>
      <h1 className="text-xl font-semibold">No encontramos esta página</h1>
      <p className="max-w-md text-sm text-neutral-600">
        El enlace puede estar roto o la página pudo haberse movido. Si escaneaste
        un código y esperabas ver una caja o una tarima, vuelve a intentarlo.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-medium text-white"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
