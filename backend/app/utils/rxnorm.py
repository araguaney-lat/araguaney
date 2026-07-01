"""Thin client for the NLM RxNorm REST API (no API key required).

Used only for INN autocomplete during intake — never as authoritative data.

Raises ``httpx.HTTPError`` on connectivity/timeout failures so the caller
can return 503. Returns an empty list when the query yields no results.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_BASE = "https://rxnav.nlm.nih.gov/REST"
_TIMEOUT = 5.0
_MAX_RESULTS = 10


async def search_inn(q: str) -> list[dict]:
    """Return up to 10 deduplicated INN suggestions for query *q*.

    Each item: ``{"rxcui": str, "name": str}``.

    Raises ``httpx.HTTPError`` on network/timeout failures.
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(
            f"{_BASE}/approximateTerm.json",
            params={"term": q, "maxEntries": 20},
        )

    if r.status_code != 200:
        logger.warning("RxNorm returned %s for q=%r", r.status_code, q)
        return []

    candidates = (
        r.json()
        .get("approximateGroup", {})
        .get("candidate") or []
    )

    seen: set[str] = set()
    results: list[dict] = []
    for c in candidates:
        rxcui = c.get("rxcui")
        name = c.get("name")
        if not rxcui or not name or rxcui in seen:
            continue
        seen.add(rxcui)
        results.append({"rxcui": rxcui, "name": name})
        if len(results) >= _MAX_RESULTS:
            break

    return results
