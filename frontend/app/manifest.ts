import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Nombre y descripción dicen "software para", no "centros de acopio" a
    // secas: instalada en el teléfono, esta ficha es lo único que se lee, y sin
    // el "para" Araguaney parece ser un centro de acopio en vez de la
    // herramienta que usan.
    name: "Araguaney — Software para centros de acopio",
    short_name: "Araguaney",
    description: "Software para centros de acopio de ayuda humanitaria",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FBF7EE",
    theme_color: "#F3C033",
    orientation: "portrait",
    // Los dos PNG se generan con zona segura (el logo ocupa el 80% del lienzo)
    // porque Android recorta el icono a la forma del lanzador, a veces circular.
    // Eso los hace válidos para ambos propósitos, y por eso cada archivo se
    // declara dos veces: el tipo de Next admite un solo `purpose` por entrada,
    // aunque el estándar permita "any maskable" en una sola.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
