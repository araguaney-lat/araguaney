# Fase 29 — De `araguaney.lat` a `araguaney.org`

> Project Galileo se otorga **por dominio**, y Cloudflare lo otorgó a
> `araguaney.org`, que vive en una cuenta de Cloudflare distinta de la que hoy
> sirve `araguaney.lat`. Mientras el producto siga en `.lat`, la protección
> otorgada no protege nada. Esta fase muda el producto completo al dominio y a la
> cuenta nuevos sin cortar el servicio en ningún momento.
>
> **Costo:** cero en servicios nuevos. Todo es configuración en Cloudflare,
> Vercel, Railway y Resend, más un PR que concentra el dominio en un solo lugar
> del código.

---

## Qué protege Galileo y qué no

Cloudflare solo inspecciona el tráfico que pasa por su proxy:

| Pieza | Cómo se sirve | ¿La cubre Galileo? |
|---|---|---|
| API (`api.`) | Railway detrás del proxy de Cloudflare | **Sí.** Es donde la protección rinde |
| Web (`www.` y el apex) | Vercel, con DNS sin proxy | **No.** Vercel pide no proxiar su tráfico y Cloudflare lo confirmó: no hay un patrón soportado para hacerlo |

La web depende de las protecciones de Vercel (WAF, límites de gasto). La
decisión de costos de [`cloudflare-project-galileo.md`](../integrations/cloudflare-project-galileo.md)
sigue en pie: si hay que pagar algo, lo primero es Vercel Pro.

## El orden es lo que evita el corte

El servicio no se corta porque **cada pieza funciona en los dos dominios a la
vez** antes de que algo apunte al nuevo, y el dominio viejo pasa a redirigir solo
después de verificar el nuevo:

1. **La cuenta nueva queda lista sin tocar producción** (bloque A).
2. **La web pasa primero** y sigue hablando con la API en `.lat`. El servidor de
   la web consulta la API por `API_URL` y el navegador por `NEXT_PUBLIC_API_URL`;
   ninguna de las dos depende del dominio de la web, siempre que el CORS de la API
   acepte el origen nuevo (bloque B).
3. **El correo saliente** cambia de remitente solo cuando el dominio nuevo está
   verificado en Resend (bloque C).
4. **La API** suma `api.araguaney.org` junto a `api.araguaney.lat`, con los dos
   dominios activos al mismo tiempo (bloque D).
5. **La app nativa** se compila contra el dominio nuevo (bloque E).
6. **Lo viejo se retira** solo cuando ningún cliente soportado lo usa (bloque F).

En cada paso, volver atrás consiste en revertir una variable o quitar una
redirección. No hay migración de datos: la base de datos no guarda el dominio.

## Lo que se rompe, y cómo se contiene

| Qué | Por qué | Mitigación |
|---|---|---|
| Las llamadas del navegador a la API desde `.org` | El navegador llama a la API directamente, y el backend solo acepta los orígenes de `FRONTEND_URL` | `.org` entra a `FRONTEND_URL` en cuanto la web responde en ese dominio (tarea 7), antes del corte |
| Las sesiones abiertas en el panel | La cookie de sesión pertenece al host; en el dominio nuevo no existe | Aceptado: hay que volver a iniciar sesión una vez. Hoy no hay usuarios externos |
| El correo saliente, si el remitente cambia antes de tiempo | Resend rechaza un remitente de un dominio sin verificar, y con eso se caen las invitaciones y el reinicio de contraseña | `MAIL_FROM` cambia **después** de verificar el dominio (tarea 5 → 12) |
| Toda la API, al activar `api.araguaney.org` | Con el modo solo-Cloudflare activo, el backend rechaza lo que no trae el encabezado secreto, y la zona nueva todavía no lo inyecta | La regla de transformación va en la zona nueva **antes** de mandarle tráfico, y se prueba directo contra el hostname nuevo (tarea 14) |
| Turnstile, si cambia la llave sin el hostname | El widget rechaza un dominio que no tiene registrado y bloquea los formularios públicos | Widget nuevo con **los dos** dominios registrados; las dos llaves cambian en un mismo despliegue (tareas 6 y 9) |
| Las imágenes de QR de la ficha pública | La CSP calcula `img-src` a partir de `NEXT_PUBLIC_API_URL` **en build** | Cambiar la variable obliga a reconstruir; se verifica la ficha `/qr/<código>` después del despliegue (tarea 15) |
| El correo entrante a las direcciones públicas | Si un texto publica `hola@araguaney.org` antes de que exista el buzón, el mensaje rebota | Los buzones de `.org` se crean y se prueban antes de que algún texto los mencione (tarea 4 → 8) |
| Los eventos de Resend de correos ya enviados | El webhook descarta remitentes que no son nuestros (#322), y durante el cambio llegan eventos de los dos dominios | `EMAIL_OWNED_DOMAINS` declara **los dos** dominios mientras dure la transición |

## Tareas

### Bloque A — La cuenta nueva, lista antes de mover nada

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 1 | Registrar la respuesta de Galileo | La bitácora [`cloudflare-project-galileo.md`](../integrations/cloudflare-project-galileo.md) recoge el alta de `araguaney.org`, el alcance real (API sí, web no) y lo que sustituye a Zone Hold en Business. | 🟢 Baja | ✅ Done |
| 2 | Inventario de la zona actual | Exportar de la cuenta vieja todo lo que configura `araguaney.lat`: registros DNS, reglas de transformación, reglas de WAF y de límite de tasa, modo SSL/TLS, enrutamiento de correo y widgets de Turnstile. Una regla que nadie anotó se pierde en silencio al mudarse. **El inventario no entra al repositorio**: contiene los parámetros de los controles. | 🟢 Baja | ⬜ Pendiente |
| 3 | Blindar la cuenta y el dominio | 2FA en la cuenta nueva, bloqueo de transferencia y 2FA en el registrador, DNSSEC en la zona. Zone Hold solo existe en Enterprise (el error 1005 del API es esperado en Business), y Cloudflare confirmó que estas son las mitigaciones correctas en el plan actual. | 🟢 Baja | ⬜ Pendiente |
| 4 | Buzones en `.org` | Recrear en la zona nueva las direcciones públicas (`hola`, `privacidad`, `security`, `conducta`, `contacto`) con el mismo mecanismo que hoy reciben las de `.lat`, y mandar un correo de prueba a cada una. | 🟢 Baja | ⬜ Pendiente |
| 5 | Dominio de envío en Resend | Dar de alta el dominio nuevo en Resend y publicar SPF, DKIM y DMARC en la zona nueva hasta que Resend lo marque verificado. Producción no cambia en este paso. | 🟢 Baja | ⬜ Pendiente |
| 6 | Widget de Turnstile en la cuenta nueva | Crear el widget con `araguaney.lat` **y** `araguaney.org` como hostnames, para que la llave nueva funcione en cualquiera de los dos dominios durante la transición. | 🟢 Baja | ⬜ Pendiente |

### Bloque B — La web

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 7 | Dominios en Vercel | Agregar `www.araguaney.org` (canónico) y `araguaney.org` (redirige con 308 a `www`, como hoy hace `.lat`). Registros DNS **sin proxy** en la zona nueva. A partir de aquí la web responde en los dos dominios; las etiquetas canónicas siguen apuntando a `.lat`, así que no hay contenido duplicado. En el mismo paso, `https://www.araguaney.org` se agrega **al final** de `FRONTEND_URL` en el backend: el CORS lo acepta y los enlaces de los correos siguen saliendo con `.lat`. | 🟢 Baja | ⬜ Pendiente |
| 8 | El dominio en un solo lugar del código | Hoy aparece escrito a mano en unas 170 líneas: plantillas de correo, pie de manifiestos y etiquetas, páginas públicas, textos legales, `llms.txt`. Concentrarlo en `app/utils/branding.py` (sitio y direcciones de contacto) para el backend y en una constante junto a `src/lib/seo.ts` para el frontend, y que todo lo demás lo lea de ahí. Así, cambiar de dominio es cambiar un valor y no hacer un reemplazo masivo de texto. En el mismo PR: textos legales, `llms*.txt`, `README`, `SECURITY`, `CODE_OF_CONDUCT`, `.env.example` y las pruebas. | 🟠 Media | ⬜ Pendiente |
| 9 | Corte de la web | Un solo despliegue: el merge de la tarea 8 más las variables de Vercel (`NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL` si está definida, las dos llaves de Turnstile) y, en el backend, `FRONTEND_URL` con `.org` **primero**: la primera entrada es la que arma los enlaces de los correos y los QR, y `.lat` se queda después para el CORS. Verificar: inicio de sesión, un formulario público con Turnstile, la ficha de QR, una captura. | 🟠 Media | ⬜ Pendiente |
| 10 | `.lat` redirige a `.org` | En Vercel, `araguaney.lat` y `www.araguaney.lat` pasan a redirigir con 308 a `www.araguaney.org`, conservando la ruta. Va **después** de verificar la tarea 9. Para deshacerlo basta con quitar la redirección. | 🟢 Baja | ⬜ Pendiente |
| 11 | Buscadores | Propiedad nueva en Search Console verificada por DNS en la zona nueva, aviso de cambio de dirección desde la propiedad vieja, envío del sitemap y flujo de Analytics con el dominio nuevo. La llave de IndexNow vive en `public/` y se muda sola. | 🟢 Baja | ⬜ Pendiente |

### Bloque C — Correo saliente

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 12 | Cambiar el remitente | `MAIL_FROM` al dominio nuevo y `EMAIL_OWNED_DOMAINS` con los dos dominios. Requiere la tarea 5 verificada. Probar de punta a punta una invitación, un reinicio de contraseña y una confirmación de donación, revisando la entrega y los encabezados de autenticación. | 🟢 Baja | ⬜ Pendiente |

### Bloque D — La API en Railway

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 13 | `api.araguaney.org` en Railway | Agregarlo como dominio propio **junto** a `api.araguaney.lat`, sin reemplazarlo. CNAME con proxy en la zona nueva y modo SSL/TLS compatible con Railway (confirmar en su documentación al ejecutarlo; Flexible produce un bucle de redirecciones). | 🟠 Media | ⬜ Pendiente |
| 14 | Origen cerrado en la zona nueva | Replicar la regla de transformación con el mismo secreto compartido y las reglas de WAF y de límite de tasa del inventario (tarea 2), ahora con lo que permite Galileo. Probar contra el hostname nuevo **antes** de que nada apunte a él: una petición que pasa por Cloudflare responde, y una que llega directo a Railway se rechaza. | 🟠 Media | ⬜ Pendiente |
| 15 | La web apunta a la API nueva | `API_URL` y `NEXT_PUBLIC_API_URL` en Vercel al dominio nuevo, con reconstrucción incluida (la CSP se calcula en build). Para volver atrás se revierte la variable. | 🟢 Baja | ⬜ Pendiente |
| 16 | Webhook de Resend | Mover la URL del webhook al dominio nuevo de la API, con el mismo secreto, y confirmar que llega un evento real. | 🟢 Baja | ⬜ Pendiente |

### Bloque E — App nativa (`araguaney-app`)

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 17 | Compilar contra el dominio nuevo | La URL base de la API no está escrita en `lib/`, entra en build. Compilar con el dominio nuevo, revisar los enlaces universales (archivos de asociación servidos desde la web, si existen) y los datos de prueba con `.lat` (cosmético). Las notificaciones push no dependen del dominio. | 🟠 Media | ⬜ Pendiente |
| 18 | Versión mínima | Cuando la versión nueva esté publicada, subir `MIN_SUPPORTED_CLIENT_VERSION` para que los binarios viejos pidan actualización en vez de fallar el día que se retire `api.araguaney.lat`. | 🟢 Baja | ⬜ Pendiente |

### Bloque F — Retiro de lo viejo

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 19 | Retirar `api.araguaney.lat` | Solo cuando ninguna versión soportada de la app lo use (tarea 18). Quitarlo de Railway y de la zona vieja, y dejar `FRONTEND_URL` y `EMAIL_OWNED_DOMAINS` solo con `.org`. | 🟢 Baja | ⬜ Pendiente |
| 20 | Qué pasa con `araguaney.lat` | Recomendado: **mantenerlo renovado y redirigiendo**. Si caduca, un tercero puede registrarlo y recibir el tráfico de cualquier enlace viejo bajo nuestro nombre. Decidir además si su zona se muda a la cuenta nueva para tener todo en un solo lugar. | 🟢 Baja | ⬜ Pendiente |
| 21 | Documentación | Reemplazar `.lat` en `docs/` (observabilidad, mantenimiento SEO, integraciones) y en el `CLAUDE.md`, y cerrar la bitácora de Galileo con la fecha del corte. | 🟢 Baja | ⬜ Pendiente |

## Lo que esta fase no hace

- **No proxia la web por Cloudflare.** Vercel no lo soporta, y forzarlo rompería
  su caché y sus certificados.
- **No usa Cloudflare for SaaS.** Está disponible en Business y serviría si algún
  día un centro quisiera operar con su propio dominio, pero hoy nadie lo pide.
- **No cambia el nombre del producto, el repositorio ni la organización de
  GitHub** (`araguaney-lat`). Son identificadores, no el dominio, y moverlos no
  agrega protección.
