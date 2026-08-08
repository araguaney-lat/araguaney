"""El endpoint de versión mínima del cliente: público, cacheable, sin sesión."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


def test_returns_min_and_latest():
    with patch("app.routers.client.settings.min_supported_client_version", "1.2.0"), \
         patch("app.routers.client.settings.latest_client_version", "1.5.0"):
        res = TestClient(app).get("/v1/client/version")
    assert res.status_code == 200
    body = res.json()
    assert body == {"min_supported": "1.2.0", "latest": "1.5.0"}


def test_is_edge_cacheable():
    # Es público y no cambia por usuario: debe cachearse en el edge, no marcarse
    # no-store como las lecturas por sesión.
    res = TestClient(app).get("/v1/client/version")
    assert "max-age" in res.headers.get("Cache-Control", "")


def test_needs_no_authentication():
    res = TestClient(app).get("/v1/client/version")
    assert res.status_code == 200
