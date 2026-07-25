"""IndexNow submission — instant indexing for Bing/Yandex.

Bing's index feeds ChatGPT Search and Microsoft Copilot, so getting a URL into
Bing fast means it reaches those AI answer engines fast. IndexNow is the ping
protocol for that. See Fase 17 task 2.

The submission is best-effort: any failure is logged and swallowed — SEO pinging
must never break the request that triggered it.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_ENDPOINT = "https://api.indexnow.org/indexnow"

# IndexNow rejects non-public hosts; skip them so local/dev never pings.
_NON_PUBLIC_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}


def _site_url() -> str:
    # Same convention as email links: first entry of the (possibly comma-separated)
    # FRONTEND_URL, no trailing slash. Should be the canonical www host in prod.
    return settings.frontend_url.split(",")[0].strip().rstrip("/")


async def submit_url(path: str) -> None:
    """Notify IndexNow that a public URL was created or updated.

    `path` is a site-relative path like "/eventos/mi-campana". No-op when the
    IndexNow key is unset or the host isn't public (e.g. localhost in dev).
    """
    key = settings.indexnow_key.strip()
    if not key:
        return

    site = _site_url()
    host = httpx.URL(site).host
    if not host or host in _NON_PUBLIC_HOSTS or host.endswith(".local"):
        logger.debug("IndexNow: skipping non-public host %r", host)
        return

    url = f"{site}{path if path.startswith('/') else '/' + path}"
    payload = {
        "host": host,
        "key": key,
        "keyLocation": f"{site}/{key}.txt",
        "urlList": [url],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(_ENDPOINT, json=payload)
        if resp.status_code >= 400:
            logger.warning("IndexNow submit failed (%s) for %s", resp.status_code, url)
        else:
            logger.info("IndexNow submitted %s (%s)", url, resp.status_code)
    except Exception as exc:  # noqa: BLE001 — never let SEO pinging surface an error
        logger.warning("IndexNow submit error for %s: %s", url, exc)
