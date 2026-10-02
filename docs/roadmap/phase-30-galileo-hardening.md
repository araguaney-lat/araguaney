# Fase 30 — Aprovechar Project Galileo

> La Fase 29 puso la API detrás de la zona que tiene Galileo. Esta fase revisa la
> guía de seguridad que Cloudflare entrega a los participantes del programa y
> aplica lo que corresponde a Araguaney: lo que falta, lo que ya estaba y lo que
> no aplica porque la zona protege una API y no un sitio web.
>
> **Costo:** cero. Todo lo usado viene incluido en el plan que otorga Galileo.

---

## Lo que la guía pide y ya estaba cumplido

Segundo factor en la cuenta, DNSSEC, proxy activo en la API, origen cerrado (solo
se entra por Cloudflare, comprobado con un 403 directo a Railway), SSL/TLS Full
(strict), redirección de HTTP a HTTPS con HSTS, IP real del visitante desde
`CF-Connecting-IP` (`app/utils/cloudflare.py`), registros MX que no exponen el
origen, y reglas propias de WAF y de límite de tasa.

## Lo que no aplica, y por qué

| Recomendación | Por qué no |
|---|---|
| Bloquear por *bot score* | La propia guía la limita a zonas "sin componente de API". Esta zona es solo API |
| *Super Bot Fight Mode* | Clasificaría como bot a la aplicación nativa y a la cola offline, que no son navegadores |
| "I'm Under Attack" y subir el *Security Level* | Responden con un desafío de JavaScript o un CAPTCHA que ningún cliente de la API puede resolver. Bajo ataque se usan reglas de bloqueo acotadas (ver el runbook) |
| OWASP Core Ruleset | Funciona por puntaje y tiende a bloquear texto libre legítimo: nombres de productos, notas de donación, direcciones. El ruleset administrado de Cloudflare cubre lo mismo con menos falsos positivos |
| Reglas de caché para la web | La web no pasa por Cloudflare: la sirve Vercel con su propia caché y su propio firewall |

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 1 | Caché en el borde de las lecturas públicas | La API ya marcaba sus respuestas públicas como cacheables, pero Cloudflare no cachea JSON sin una regla explícita, así que cada lectura llegaba a Railway (`cf-cache-status: DYNAMIC`). Regla de caché que solo aplica a **GET** sobre las rutas públicas (`/v1/public/*`, `/v1/client/version`, `/v1/d/*`, `/p/*` y las imágenes QR de caja), excluye cualquier petición con `Authorization` y el pre-registro de donaciones, y **respeta el `Cache-Control` del origen**, de modo que lo marcado `no-store` sigue sin caché aunque caiga en la regla. Verificado: las lecturas públicas pasan de MISS a HIT; con `Authorization`, las rutas con sesión, la ficha de caja y el pre-registro siguen en DYNAMIC. Es la defensa más barata contra EDoS: un ataque contra esas rutas golpea el borde y no la factura de Railway. | 🟠 Media | ✅ Done |
| 2 | Ruleset administrado de Cloudflare, en observación | Desplegado sobre la zona con la acción forzada a **Log**: registra lo que bloquearía sin bloquear. Verificado con una inyección SQL de prueba, que pasa y queda registrada como evento del ruleset. Empieza en observación porque un falso positivo en un `POST` de captura llegaría a la aplicación como rechazo y quedaría en pendientes sin que nadie lo note. | 🟢 Baja | ✅ Done |
| 3 | Ruleset administrado en bloqueo | Revisar *Security → Analytics → Events* con tráfico real de captura (web y aplicación nativa), excluir las reglas que den falsos positivos sobre rutas concretas y cambiar la acción de **Log** a **Default**. No antes de tener una o dos semanas de tráfico real: sin tráfico, la observación no prueba nada. | 🟢 Baja | ⬜ Pendiente |
| 4 | Notificaciones de Cloudflare | Tres alertas al buzón del proyecto: origen de la API inalcanzable (*Passive Origin Monitoring*), ataque DDoS HTTP mitigado y pico de eventos de seguridad del WAF. Documentadas en la tabla de alertas de [`docs/observability.md`](../observability.md). Llegan por correo y no por Slack como el resto: enviarlas a Slack exige configurar un webhook con credencial, y queda como mejora. | 🟢 Baja | ✅ Done |
| 5 | Runbook de emergencia | [`docs/observability.md`](../observability.md) → *Runbook: la API bajo ataque*: mirar antes de tocar, endurecer las reglas existentes, no usar "I'm Under Attack" en una API, cortar la fuente por IP o ASN y escalar al soporte del programa. El canal de soporte de Galileo no se publica en el repositorio. | 🟢 Baja | ✅ Done |
| 6 | Códigos de recuperación de la cuenta | Guardados en un gestor de contraseñas, fuera del navegador y del buzón del proyecto: si se pierde el dispositivo del segundo factor, son la única forma de volver a entrar a la zona que protege la API. | 🟢 Baja | ✅ Done |

## Lo que esta fase no hace

- **No proxia la web.** Sigue en Vercel, que trae su propio firewall; ponerle un
  proxy delante lo degrada (ver `docs/observability.md`).
- **No reemplaza el límite de tasa de la aplicación.** `slowapi` sigue en cada
  endpoint público: el borde corta volumen, la aplicación conoce al usuario.
