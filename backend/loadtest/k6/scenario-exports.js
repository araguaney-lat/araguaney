// Fase 12 tarea 25 — concurrent export requests, validating the async ARQ
// pattern from tarea 15c holds up under load: each iteration starts an
// export job (box labels PDF or report CSV) and polls GET /v1/exports/{id}
// until DONE/FAILED, same flow the frontend's useExportJob hook drives.
//
// This validates two things at once: that POST <export>.pdf/.csv (202 + job)
// doesn't get rate-limited/timeout under concurrency, and that the ARQ
// worker actually drains the queue fast enough that polling converges
// within a reasonable number of attempts.
//
// Run: k6 run loadtest/k6/scenario-exports.js
// Env: BASE_URL, VUS, DURATION, N_CENTERS
// Requires the ARQ worker running (arq app.worker.WorkerSettings) — without
// it, jobs stay PENDING forever and every iteration will fail the "job
// completed" check by design (that itself is a useful signal: it means the
// fallback in-process path isn't being exercised by this concurrency level).

import http from "k6/http"
import { check, sleep } from "k6"
import { BASE_URL, CAMPAIGN_ID, loginAsCoordinator, authHeaders } from "./helpers.js"

export const options = {
  vus: parseInt(__ENV.VUS || "5", 10),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
}

const MAX_POLL_ATTEMPTS = 20
const POLL_INTERVAL_S = 1.5

let token = null

function pollUntilDone(headers, jobId) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    sleep(POLL_INTERVAL_S)
    const res = http.get(`${BASE_URL}/v1/exports/${jobId}`, { headers, tags: { name: "poll_export" } })
    if (res.status !== 200) return { done: false, status: res.status }
    const status = res.json("status")
    if (status === "DONE" || status === "FAILED") return { done: true, status }
  }
  return { done: false, status: "TIMEOUT" }
}

export default function () {
  if (token === null) {
    token = loginAsCoordinator(__VU)
  }
  const headers = authHeaders(token, __VU)

  const useBoxLabels = __VU % 2 === 0
  const startRes = useBoxLabels
    ? http.post(`${BASE_URL}/v1/boxes/labels/pdf?status=SEALED`, null, { headers, tags: { name: "start_box_labels" } })
    : http.post(
        `${BASE_URL}/v1/reports/campaign/${CAMPAIGN_ID}/export.csv?start=2026-01-01&end=2026-12-31`,
        null,
        { headers, tags: { name: "start_report_csv" } }
      )

  const started = check(startRes, { "export job created (202)": (r) => r.status === 202 })
  if (!started) {
    // Always pace iterations even on failure — otherwise a single rejected
    // request (e.g. rate limit, or a transient error) turns into a tight
    // retry loop that floods the server instead of measuring real load.
    sleep(1)
    return
  }

  const jobId = startRes.json("id")
  const result = pollUntilDone(headers, jobId)
  check(result, { "export job completed": (r) => r.done && r.status === "DONE" })
  sleep(1)
}
