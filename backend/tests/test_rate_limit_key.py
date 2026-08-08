"""La clave de rate limiting separa por usuario, no solo por IP.

Limitar por IP rompe con CGNAT móvil (varias personas comparten IPv4) y con los
route handlers de Vercel (todas sus peticiones salen de la misma IP de egreso).
Cuando hay un token válido, la clave es el usuario del token; si no, la IP. La
firma se verifica para que nadie invente un `sub` y evada su cubeta.
"""

from types import SimpleNamespace

import jwt

from app.config import settings
from app.utils.rate_limit import rate_limit_key


def _request(headers: dict | None = None, ip: str = "203.0.113.7"):
    return SimpleNamespace(
        headers=SimpleNamespace(get=(headers or {}).get),
        client=SimpleNamespace(host=ip),
    )


def _token(sub: str, secret: str | None = None) -> str:
    return jwt.encode(
        {"sub": sub}, secret or settings.secret_key, algorithm=settings.algorithm
    )


def test_a_valid_token_keys_by_user():
    req = _request({"Authorization": f"Bearer {_token('user-123')}"})
    assert rate_limit_key(req) == "user:user-123"


def test_two_users_behind_one_ip_get_separate_keys():
    # El caso CGNAT: misma IP, distinta persona, distinta cubeta.
    a = _request({"Authorization": f"Bearer {_token('aaa')}"}, ip="198.51.100.1")
    b = _request({"Authorization": f"Bearer {_token('bbb')}"}, ip="198.51.100.1")
    assert rate_limit_key(a) != rate_limit_key(b)


def test_no_token_keys_by_ip():
    req = _request({}, ip="203.0.113.9")
    assert rate_limit_key(req) == "ip:203.0.113.9"


def test_cf_connecting_ip_wins_for_anonymous():
    req = _request({"CF-Connecting-IP": "203.0.113.50"}, ip="10.0.0.1")
    assert rate_limit_key(req) == "ip:203.0.113.50"


def test_a_forged_signature_falls_back_to_ip():
    # Firmado con otro secreto: no se puede confiar en su `sub`, así que se
    # limita por IP en vez de darle una cubeta propia inventada.
    forged = _token("attacker", secret="a-different-secret-not-ours-at-all-32ch")
    req = _request({"Authorization": f"Bearer {forged}"}, ip="203.0.113.11")
    assert rate_limit_key(req) == "ip:203.0.113.11"


def test_garbage_bearer_falls_back_to_ip():
    req = _request({"Authorization": "Bearer not-a-jwt"}, ip="203.0.113.12")
    assert rate_limit_key(req) == "ip:203.0.113.12"
