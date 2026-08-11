# Subir la versión mínima soportada de la aplicación

La web se despliega junto al backend, así que un cambio de contrato se coordina
en un solo PR. La aplicación instalada no: puede estar corriendo el binario de
hace meses en un teléfono que nadie actualizó, dentro de un centro con mala
conexión. `GET /v1/client/version` existe para que esa instalación pueda
preguntar "¿sigo sirviendo?" y pedir actualización en vez de romperse sola.

Este documento dice **cuándo** se suben esos valores y qué cuesta subirlos.

---

## Los dos valores

Viven en el entorno del backend, nunca en el repositorio.

| Variable | Qué significa | Efecto en la aplicación |
|---|---|---|
| `MIN_SUPPORTED_CLIENT_VERSION` | La versión más vieja que el backend acepta | Por debajo, la aplicación **bloquea** y exige actualizar |
| `LATEST_CLIENT_VERSION` | La versión publicada más reciente | La aplicación **sugiere** actualizar, sin bloquear |

Mientras ambos sean `0.0.0`, no obligan a nada. Es el estado correcto hasta que
haya una aplicación publicada en una tienda.

## Subir `LATEST_CLIENT_VERSION`: barato, hazlo siempre

Se sube cada vez que una versión nueva termina de desplegarse en las tiendas. No
bloquea a nadie; solo hace que quien tenga una versión vieja vea el aviso.

Un detalle de tiempos: **súbelo cuando la versión ya esté disponible para
descargar**, no cuando se suba a revisión. Anunciar una actualización que todavía
no existe en la tienda produce a alguien buscando un botón que no está.

## Subir `MIN_SUPPORTED_CLIENT_VERSION`: caro, hazlo por una razón

Subirlo deja fuera a todas las instalaciones por debajo de ese número. Quien lo
sufra no puede seguir trabajando hasta actualizar, y actualizar necesita
conexión, espacio y a veces permiso del dispositivo. En un centro de acopio, un
mal día para eso es cualquier día con camiones en el andén.

**Súbelo solo cuando una versión vieja produciría datos incorrectos**, no cuando
simplemente le falten funciones. Los tres casos que lo justifican:

1. Una regla de dominio cambió y la versión vieja capturaría algo que ya no es
   válido, por ejemplo una validación de caducidad distinta.
2. Un defecto de la versión vieja corrompe o duplica inventario. Aquí bloquear es
   protección, no molestia.
3. Se retiró una operación que la versión vieja usa, lo que dentro de `/v1` solo
   debería pasar por seguridad.

**No lo subas** para "empujar la adopción" de una versión nueva, para simplificar
el mantenimiento, ni porque la versión vieja se vea anticuada. Para eso está
`LATEST_CLIENT_VERSION`, que informa sin bloquear.

## Antes de subirlo

1. Confirma que la versión que vas a exigir **está publicada y disponible** en
   Google Play (y en App Store cuando exista esa vía). Exigir una versión que
   todavía está en revisión deja a la gente sin salida.
2. Deja pasar tiempo desde su publicación para que la actualización llegue sola.
   Una semana es un mínimo razonable; en centros con conexión pobre, más.
3. Avisa por los canales que ya usan los centros antes de tocar la variable. El
   aviso dentro de la aplicación lo ve quien la abre; quien no la abrió hasta el
   día del bloqueo, no.

## Después de subirlo

Es reversible: bajar el valor vuelve a admitir las versiones anteriores de
inmediato, porque la aplicación consulta el endpoint al arrancar. Si el bloqueo
resulta prematuro, bajarlo es la primera reacción, no la última.

El endpoint es público y cacheable en el edge (`s-maxage` de una hora), así que
un cambio puede tardar hasta esa hora en verse en todas partes. Cuenta con ese
retraso al planear el momento.
