# AEO monitoring — monthly measurement instrument

> Phase 17, Group E (tasks 19–21). This is the concrete instrument the maintenance
> runbook (`docs/seo-maintenance.md`) only outlines: the fixed prompt bank, the
> tracking templates, and the KPI definitions. Running it is a recurring manual
> task; **defining** it is done here.
>
> **Scope:** measure whether AI answer engines cite Araguaney, and track Bing
> coverage alongside Google. This complements — it does not replace — the Google
> rank tracking from Phase 11 (task 22).
>
> **Cadence:** once a month, ~30 minutes. Same day each month (e.g. the 1st) so
> the series is comparable.
>
> **Privacy:** this is a manual, external process run by the operator. It is not
> user tracking and introduces no PII (CLAUDE.md §2, §9).

---

## Part 1 — AI citation tracking (task 19)

### How to run

1. Use a **fresh session** in each engine (logged out or a temporary chat), so
   personalization and memory do not skew the answer.
2. Paste each prompt **verbatim**. Do not lead the model toward Araguaney.
3. Record whether Araguaney is **cited** (named or linked) in the answer, and
   **which page** (URL) it surfaces, if any.
4. Note the date and the engine. One pass = one month.

**Engines to cover:**

- ChatGPT (Search mode)
- Perplexity
- Google Gemini
- Google AI Overviews (run the query in Google, check the AI Overview block)
- Microsoft Copilot *(optional; shares Bing grounding with ChatGPT Search)*

### The fixed prompt bank

Keep this set **stable** month to month — a changing prompt set breaks the time
series. Add prompts only at the bottom, and note the month they were added.

Prompts derive from the Phase 17 keyword clusters (E comparative, F scenario,
G geographic, H direct questions) plus the head terms.

**Spanish (ES):**

1. ¿Qué software puedo usar para gestionar un centro de acopio de ayuda humanitaria?
2. ¿Cuál es la mejor alternativa a Excel para llevar el inventario de donaciones?
3. ¿Cómo organizo las donaciones en especie de un centro de acopio?
4. ¿Qué herramienta genera manifiestos y etiquetas con QR para donaciones?
5. ¿Cómo coordino varios centros de acopio a nivel nacional?
6. ¿Qué medicamentos se pueden donar y cómo se validan por caducidad?
7. ¿Cómo preparo carga humanitaria para que pase aduana?
8. ¿Existe software gratis para gestionar donaciones de una ONG?
9. ¿Qué se necesita para montar un centro de acopio tras un sismo en México?
10. ¿Cómo llevo el inventario de un acopio por inundaciones?

**English (EN):**

11. What software can I use to run a humanitarian relief collection center?
12. What is the best spreadsheet alternative for tracking donation inventory?
13. How do I organize in-kind donations at a collection center?
14. What tool generates manifests and QR labels for donations?
15. How do I coordinate multiple collection centers nationally?
16. Is there free software to manage donations for an NGO?
17. How do I prepare humanitarian cargo to clear customs?
18. How do I run relief logistics after an earthquake?

### Results template

Copy this block into the monthly log (see *Results log* below) and fill it in.

```
## <YYYY-MM>

| # | Prompt (short) | ChatGPT | Perplexity | Gemini | AI Overviews |
|---|----------------|---------|------------|--------|--------------|
| 1 | software acopio            | ❌ | ✅ /centro-de-acopio | ❌ | ❌ |
| 2 | alternativa a Excel        | … | … | … | … |
| … |                            |   |   |   |   |

Legend: ✅ cited (note the page) · ❌ not cited · ⚠️ mentioned without link.
Notes: <anything notable — a competitor cited, a wrong claim, a new page surfacing>
```

---

## Part 2 — Bing coverage (task 20)

Bing feeds ChatGPT Search and Copilot, so Bing coverage is an early signal for AI
grounding. The domain is already verified in Bing Webmaster Tools with the sitemap
submitted (task 1). Each month, pull these from **Bing Webmaster Tools** and log
them next to the GSC figures:

| Metric | Where | Note |
|--------|-------|------|
| Indexed pages | Bing WMT → Site Explorer / Index Explorer | Should track the sitemap count (33). A gap means Bing is not indexing something Google is. |
| Impressions (28 d) | Bing WMT → Search Performance | Trend, not absolute. |
| Clicks (28 d) | Bing WMT → Search Performance | Trend. |
| Top queries | Bing WMT → Search Performance | Compare against GSC top queries; Bing-only queries are AI-grounding opportunities. |

```
## <YYYY-MM> — Bing

Indexed: <n>/33 · Impressions (28d): <n> · Clicks (28d): <n>
Top queries: <q1>, <q2>, <q3>
Gap vs GSC: <pages indexed in Google but not Bing, if any>
```

---

## Part 3 — AEO KPIs (task 21)

Position in Google is no longer the whole picture. These are the metrics to track
monthly, all derived from Parts 1 and 2 — nothing here needs user tracking.

| KPI | Definition / formula | Source | Target direction |
|-----|----------------------|--------|------------------|
| **AI share-of-voice** | Prompts where Araguaney is cited ÷ total prompts run, per engine and overall. E.g. 4/18 = 22%. | Part 1 | ↑ month over month |
| **Citation rate by engine** | Same ratio split per engine — reveals which engine grounds us best (usually the Bing-fed ones first). | Part 1 | ↑, close the gap between engines |
| **Cited-page distribution** | Count of citations per landing page. Shows which content the engines actually pull (pillars, comparative, scenarios). | Part 1 | breadth ↑ (more distinct pages cited) |
| **Answer accuracy** | Of the answers that cite us, how many describe Araguaney correctly (free tool, in-kind coordination, no money). Wrong claims are a content-clarity signal. | Part 1 notes | 100% correct |
| **Bing index coverage** | Indexed pages ÷ sitemap URLs (n/33). | Part 2 | = 33/33 |
| **Brand mentions** | Count of independent, non-self-published mentions found this month (directory listings, articles, ReliefWeb/DPG). Entity signal that also unblocks Wikidata (task 6). | Manual note | ↑ (each one matters) |

### Baseline and interpretation

- **The first month is the baseline.** Do not read a single month as good or bad;
  read the **trend** across months.
- **Share-of-voice is the headline KPI.** It is the AEO analogue of average
  position: it answers "when someone asks our category question to an AI, how
  often do we show up?"
- **Bing-fed engines move first.** If ChatGPT Search and Copilot cite us before
  Gemini/AI Overviews, that is expected (Bing grounding). Gemini/AI Overviews
  tend to lag and lean more on entity signals (`sameAs`, Wikidata — task 6).
- **A wrong claim is actionable.** If an engine says Araguaney charges money or
  handles beneficiaries, that is a content-clarity gap to fix on the cited page,
  not a metric to bury.

---

## Results log

Append one dated block per month here (or split into `aeo-results.md` once this
file grows). Newest first.

<!-- Add monthly results below this line. -->
