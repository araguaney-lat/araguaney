"""Thin client for the Open Food Facts API.

Used only for barcode-triggered prefill in intake — never as authoritative data.

Raises ``httpx.HTTPError`` (or subclasses) on connectivity/timeout failures so
the caller can return 503. Returns None when the product is simply not found.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_BASE = "https://world.openfoodfacts.org/api/v0/product"


async def lookup_barcode(gtin: str) -> dict | None:
    """Return prefill fields or None when product not found.

    Raises ``httpx.HTTPError`` on network / timeout failures — callers should
    catch this and return 503.
    """
    async with httpx.AsyncClient(timeout=settings.open_food_facts_timeout) as client:
        r = await client.get(f"{_BASE}/{gtin}.json")
    if r.status_code != 200:
        return None
    data = r.json()
    if data.get("status") != 1:
        return None
    product = data.get("product", {})
    return {
        "gtin": gtin,
        "display_name": product.get("product_name") or product.get("product_name_es") or "",
        "brand": product.get("brands", "").split(",")[0].strip() or None,
        "category": "FOOD",
    }
