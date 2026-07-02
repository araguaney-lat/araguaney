// Shared helpers for the Fase 12 Grupo F k6 scenarios.
//
// Rate limiting note: app.utils.rate_limit is keyed by client IP
// (get_client_ip, honors X-Forwarded-For). Every request in this suite sets
// a synthetic per-VU IP so each virtual user gets its own independent
// rate-limit bucket — otherwise, running from one machine, every VU would
// share a single bucket and the test would just measure the rate limiter,
// not the app. This mirrors production, where every real user has a
// different IP via Cloudflare.

import http from "k6/http"
import { check } from "k6"

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8000"
export const N_CENTERS = parseInt(__ENV.N_CENTERS || "20", 10)
export const LOADTEST_PASSWORD = __ENV.LOADTEST_PASSWORD || "loadtest12345"
export const LOADTEST_PRODUCT_TYPE_ID = "00000000-0000-0000-0000-0000000000e1"
export const CAMPAIGN_ID = "00000000-0000-0000-0000-0000000000c1"

export function syntheticIp(vu) {
  const a = 10
  const b = Math.floor(vu / 65536) % 256
  const c = Math.floor(vu / 256) % 256
  const d = vu % 256
  return `${a}.${b}.${c}.${d}`
}

export function ipHeaders(vu) {
  return { "X-Forwarded-For": syntheticIp(vu) }
}

// Logs in as a center-scoped coordinator, cycling through the N_CENTERS
// seeded by loadtest/seed.py. Each VU gets a distinct center + a distinct
// synthetic IP, so both app-level tenant scoping and rate limiting see
// realistic, independent traffic.
export function loginAsCoordinator(vu) {
  const centerIndex = vu % N_CENTERS
  return login(`coordinator-${centerIndex}`, vu)
}

export function loginAsNationalAdmin(vu) {
  return login("national-admin", vu)
}

function login(username, vu) {
  const res = http.post(
    `${BASE_URL}/v1/auth/login`,
    { username, password: LOADTEST_PASSWORD },
    { headers: ipHeaders(vu), tags: { name: "login" } }
  )
  check(res, { "login succeeded": (r) => r.status === 200 })
  const token = res.json("access_token")
  if (!token) {
    throw new Error(`login failed for ${username}: ${res.status} ${res.body}`)
  }
  return token
}

export function authHeaders(token, vu) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...ipHeaders(vu),
  }
}
