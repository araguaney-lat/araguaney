"""El endpoint de login por email sin verificar identidad no puede volver.

`POST /v1/auth/oauth` aceptaba `{email, ...}` y emitía un JWT válido para esa
cuenta **sin verificar nada contra el proveedor OAuth**: ni `id_token`, ni
handshake con Google, ni uso de las credenciales de cliente. Cualquiera que
conociera o adivinara un correo tomaba control de esa cuenta —incluidas las de
administración— salvo que tuviera TOTP.

Nunca tuvo cliente: el frontend usa solo `Credentials` de NextAuth. Era una
integración a medio construir, desplegada y accesible. Se eliminó de raíz
(endpoint, método de servicio y schema).

Esta prueba fija la ausencia: si alguien reintroduce la ruta sin verificación
de identidad, esto se pone rojo antes de llegar a producción. Reactivar OAuth
de verdad exige verificar el `id_token` contra el proveedor y actualizar este
test a propósito, no por descuido.
"""

from app.main import app


def _route_paths() -> set[str]:
    return {getattr(route, "path", "") for route in app.router.routes}


def test_the_unauthenticated_oauth_route_is_gone():
    assert "/v1/auth/oauth" not in _route_paths()


def test_the_service_no_longer_mints_tokens_from_a_bare_email():
    from app.services import auth_service

    # El método era el que emitía el JWT sin verificar identidad. Su ausencia
    # es el control: sin él, la ruta no se puede recablear en dos líneas.
    assert not hasattr(auth_service.AuthService, "oauth_login")
