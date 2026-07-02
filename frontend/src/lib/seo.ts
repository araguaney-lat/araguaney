export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://araguaney.lat"
).replace(/\/$/, "")

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

// Shared default share image. Next.js metadata does NOT deep-merge nested
// objects (openGraph, twitter) between layout.tsx and a page's own metadata —
// a page defining `openGraph: { title, description }` completely REPLACES
// the layout's `openGraph`, silently dropping `images`. Every page that
// defines its own openGraph/twitter metadata must re-include this image
// (or its own) explicitly; it will not fall back to the layout's.
export const DEFAULT_OG_IMAGE =
  "https://res.cloudinary.com/dtvdqlxtd/image/upload/w_1200,h_630,c_pad,b_white,f_png/v1782786243/araguaney_logo_ol8lm1"
