// Fase 12 tarea 23 — intake + seal, the highest write-volume flow in the app.
// Each iteration: one VU (acting as a volunteer at their seeded center)
// creates an intake with a box, then seals that box.
//
// Run: k6 run loadtest/k6/scenario-intake-seal.js
// Env: BASE_URL (default http://localhost:8000), VUS, DURATION, N_CENTERS

import http from "k6/http"
import { check, sleep } from "k6"
import {
  BASE_URL,
  LOADTEST_PRODUCT_TYPE_ID,
  CAMPAIGN_ID,
  loginAsCoordinator,
  authHeaders,
} from "./helpers.js"

export const options = {
  vus: parseInt(__ENV.VUS || "10", 10),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
  },
}

let token = null

export default function () {
  if (token === null) {
    // k6 module state is per-VU (separate JS VM each) — this runs once per VU.
    token = loginAsCoordinator(__VU)
  }
  const headers = authHeaders(token, __VU)

  const intakeRes = http.post(
    `${BASE_URL}/v1/intakes`,
    JSON.stringify({
      campaign_id: CAMPAIGN_ID,
      notes: "k6 load test intake",
      boxes: [
        {
          product_type_id: LOADTEST_PRODUCT_TYPE_ID,
          quantity: 50,
          unit: "unidad",
          batch: `LT-${__VU}-${__ITER}`,
          // LOADTEST_PRODUCT_TYPE_ID is category FOOD — WHO shelf-life validation
          // rejects it without expiry_date (min_shelf_life_days=180), so a real
          // seal-able DRAFT box needs one comfortably past that.
          expiry_date: "2027-06-01",
          weight_kg: "5.0",
        },
      ],
    }),
    { headers, tags: { name: "create_intake" } }
  )
  const ok = check(intakeRes, { "intake created": (r) => r.status === 201 })
  if (!ok) {
    // Always pace iterations even on failure — otherwise one rejected
    // request turns into a tight retry loop instead of measuring real load.
    sleep(1)
    return
  }

  const boxId = intakeRes.json("boxes.0.id")
  const sealRes = http.post(`${BASE_URL}/v1/boxes/${boxId}/seal`, null, {
    headers,
    tags: { name: "seal_box" },
  })
  check(sealRes, { "box sealed": (r) => r.status === 200 })

  sleep(1)
}
