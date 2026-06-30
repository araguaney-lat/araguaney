const CACHE = "araguaney-v1"
const OFFLINE_URL = "/offline"

// Pages to precache on install
const PRECACHE_URLS = [OFFLINE_URL]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  // Cache-first for fingerprinted Next.js static assets (immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            caches.open(CACHE).then((c) => c.put(event.request, res.clone()))
            return res
          })
      )
    )
    return
  }

  // Network-first for HTML navigation and API — fall back to cache then offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(event.request, res.clone()))
          return res
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((hit) => hit || caches.match(OFFLINE_URL))
        )
    )
    return
  }

  // Stale-while-revalidate for other same-origin resources (fonts, images, etc.)
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fresh = fetch(event.request).then((res) => {
          cache.put(event.request, res.clone())
          return res
        })
        return cached || fresh
      })
    )
  )
})
