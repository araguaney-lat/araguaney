"""Tests for the IndexNow submission util (Fase 17 task 2)."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.utils import indexnow


def _run(path: str) -> None:
    asyncio.run(indexnow.submit_url(path))


class TestSubmitUrl:
    def test_noop_when_key_empty(self):
        with patch.object(indexnow.settings, "indexnow_key", ""), \
             patch("app.utils.indexnow.httpx.AsyncClient") as client:
            _run("/eventos/x")
            client.assert_not_called()

    def test_noop_when_host_non_public(self):
        with patch.object(indexnow.settings, "indexnow_key", "k123"), \
             patch.object(indexnow.settings, "frontend_url", "http://localhost:3000"), \
             patch("app.utils.indexnow.httpx.AsyncClient") as client:
            _run("/eventos/x")
            client.assert_not_called()

    def test_posts_when_configured(self):
        mock_client = AsyncMock()
        mock_client.post.return_value = MagicMock(status_code=200)
        cm = AsyncMock()
        cm.__aenter__.return_value = mock_client

        with patch.object(indexnow.settings, "indexnow_key", "k123"), \
             patch.object(indexnow.settings, "frontend_url", "https://www.araguaney.lat"), \
             patch("app.utils.indexnow.httpx.AsyncClient", return_value=cm):
            _run("/eventos/mi-campana")

        mock_client.post.assert_awaited_once()
        payload = mock_client.post.call_args.kwargs["json"]
        assert payload["host"] == "www.araguaney.lat"
        assert payload["key"] == "k123"
        assert payload["keyLocation"] == "https://www.araguaney.lat/k123.txt"
        assert payload["urlList"] == ["https://www.araguaney.lat/eventos/mi-campana"]

    def test_swallows_http_errors(self):
        cm = AsyncMock()
        cm.__aenter__.return_value.post.side_effect = RuntimeError("network down")
        with patch.object(indexnow.settings, "indexnow_key", "k123"), \
             patch.object(indexnow.settings, "frontend_url", "https://www.araguaney.lat"), \
             patch("app.utils.indexnow.httpx.AsyncClient", return_value=cm):
            # Must not raise — SEO pinging never breaks the caller.
            _run("/eventos/x")
