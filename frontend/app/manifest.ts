import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Araguaney — Centros de acopio",
    short_name: "Araguaney",
    description: "Coordinación de centros de acopio humanitario",
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
