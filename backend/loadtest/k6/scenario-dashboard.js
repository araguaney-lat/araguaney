// Fase 12 tarea 24 — concurrent reads on the national dashboard, the
// heaviest aggregation queries in the app (and the ones that benefit most
// from the Grupo A indices — see tarea 26 for the before/after comparison
// this scenario is used for).
//
// Half the VUs act as national_admin (center_id=NULL — aggregates across
// ALL seeded centers, the worst case) and half as a center-scoped
// coordinator, so both AggregateRepository code paths get exercised.
//
// Run: k6 run loadtest/k6/scenario-dashboard.js
// Env: BASE_URL, VUS, DURATION, N_CENTERS
//
// IMPORTANT for a real before/after comparison: run this WITHOUT REDIS_URL
// set on the backend. app.utils.cache no-ops when Redis is absent, so every
// request hits the DB fresh — with Redis on, only the first request per
// scope would ever touch the DB and you'd be measuring the cache, not the
// index.

import http from "k6/http"
import { check, sleep } from "k6"
import { BASE_URL, loginAsCoordinator, loginAsNationalAdmin, authHeaders } from "./helpers.js"

export const options = {
  vus: parseInt(__ENV.VUS || "20", 10),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
}

let token = null

export default function () {
  if (token === null) {
    token = __VU % 2 === 0 ? loginAsNationalAdmin(__VU) : loginAsCoordinator(__VU)
  }
  const headers = authHeaders(token, __VU)

  const nationalRes = http.get(`${BASE_URL}/v1/dashboard/national`, {
    headers,
    tags: { name: "dashboard_national" },
  })
  check(nationalRes, { "national dashboard 200": (r) => r.status === 200 })

  const weightRes = http.get(`${BASE_URL}/v1/dashboard/weight`, {
    headers,
    tags: { name: "dashboard_weight" },
  })
  check(weightRes, { "weight dashboard 200": (r) => r.status === 200 })

  sleep(1)
}
