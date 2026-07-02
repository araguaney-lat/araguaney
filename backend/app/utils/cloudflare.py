"""
Cloudflare integration utilities.

- get_client_ip: reads the real visitor IP from CF-Connecting-IP (set by
  Cloudflare on every proxied request), falling back to X-Forwarded-For and
  then request.client.host for local/non-proxied environments.
"""

from fastapi import Request


def get_client_ip(request: Request) -> str:
    """Return the real visitor IP address.

    Priority:
    1. CF-Connecting-IP  — set by Cloudflare, cannot be spoofed when proxied
    2. X-Forwarded-For   — first entry (original client), set by most proxies
    3. request.client.host — direct connection (local dev / non-proxied)
    """
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    if request.client:
        return request.client.host

    return "unknown"
