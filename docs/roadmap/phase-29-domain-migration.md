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

## Lo que se rompe, cómo se nota y cómo se repara

Hoy no hay usuarios externos, así que se acepta romper algo durante la mudanza.
Lo que no se acepta es dejarlo roto: cada riesgo tiene un síntoma que lo delata y
una reparación conocida.

| Qué | Síntoma | Prevención | Reparación |
|---|---|---|---|
| **Toda la API** al activar `api.araguaney.org` | Todas las peticiones al hostname nuevo responden 403: el modo solo-Cloudflare no encuentra el encabezado secreto | La regla de transformación va en la zona nueva antes de mandarle tráfico (tarea 14) | Crear la regla con el mismo secreto; mientras tanto, `API_URL` vuelve a `.lat` |
| **El correo saliente** | Las invitaciones y los reinicios de contraseña no llegan; Resend registra el rechazo del remitente | `MAIL_FROM` cambia después de verificar el dominio (tarea 5 → 12) | Regresar `MAIL_FROM` a `.lat` en Railway |
| **El CORS** del navegador hacia la API | El panel en `.org` falla al cargar datos, y la consola del navegador muestra un error de CORS | `.org` entra a `FRONTEND_URL` en cuanto la web responde en ese dominio (tarea 7) | Agregar el origen a `FRONTEND_URL` |
| **Turnstile** | Los formularios públicos (contacto, `/donar`, alta de centro) rechazan el envío | Widget nuevo con los dos dominios registrados, y las dos llaves cambian en el mismo despliegue (tareas 6 y 9) | Agregar el hostname al widget, o regresar las llaves anteriores |
| **Las imágenes de QR** de la ficha pública | La ficha carga sin la imagen del código, y la consola muestra un bloqueo por CSP | Reconstruir al cambiar `NEXT_PUBLIC_API_URL`, porque la CSP se calcula en build (tarea 15) | Volver a desplegar |
| **SSL entre Cloudflare y Railway** | Bucle de redirecciones o error 525/526 en `api.araguaney.org` | Modo SSL/TLS compatible con Railway desde el principio (tarea 13) | Ajustar el modo en la zona nueva |
| **El correo entrante** | Un mensaje a una dirección publicada en `.org` rebota | Los buzones se crean y se prueban antes de que algún texto los mencione (tarea 4 → 8) | Crear la ruta del buzón que falta |
| **Los eventos de Resend** | El webhook descarta como ajenos los eventos de correos ya enviados desde `.lat` (#322) | `EMAIL_OWNED_DOMAINS` declara los dos dominios durante la transición | Agregar el dominio que falta |
| **El inicio de sesión** | Las sesiones abiertas se pierden, y si la URL de autenticación quedó en `.lat`, el ingreso regresa al dominio viejo | `NEXTAUTH_URL`, si está definida, cambia en el corte (tarea 9) | Corregir la variable y volver a desplegar; la sesión perdida solo pide entrar de nuevo |

## Qué se toca en cada plataforma

| Plataforma | Qué cambia | Bloque |
|---|---|---|
| **Cloudflare** (cuenta nueva) | Zona `araguaney.org`: DNS, regla de transformación, WAF y límites de tasa, buzones de correo, Turnstile, DNSSEC | A, D |
| **Cloudflare** (cuenta vieja) | Zona `araguaney.lat`: solo lo necesario para que siga redirigiendo, y al final decidir si se muda | F |
| **Vercel** | Dominios del proyecto, redirección de `.lat` y variables (`NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`, `API_URL`, `NEXT_PUBLIC_API_URL`, Turnstile) | B, D |
| **Railway** | Dominio propio del servicio `araguaney backend` y variables (`FRONTEND_URL`, `MAIL_FROM`, `EMAIL_OWNED_DOMAINS`). El worker no expone dominio, pero comparte las variables de correo | C, D |
| **Resend** | Dominio de envío nuevo y URL del webhook | A, C, D |
| **Google** | Search Console, Analytics, Play Console (ficha, sitio web, correo de contacto, aviso de privacidad) | G |
| **Sentry** | Dominios permitidos del proyecto web, si el filtro está activo | G |

## Tareas

### Bloque A — La cuenta nueva, lista antes de mover nada

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 1 | Registrar la respuesta de Galileo | La bitácora [`cloudflare-project-galileo.md`](../integrations/cloudflare-project-galileo.md) recoge el alta de `araguaney.org`, el alcance real (API sí, web no) y lo que sustituye a Zone Hold en Business. | 🟢 Baja | ✅ Done |
| 2 | Inventario de la zona actual | Exportar de la cuenta vieja todo lo que configura `araguaney.lat`: registros DNS, reglas de transformación, reglas de WAF y de límite de tasa, modo SSL/TLS, enrutamiento de correo y widgets de Turnstile. Una regla que nadie anotó se pierde en silencio al mudarse. **El inventario no entra al repositorio**: contiene los parámetros de los controles. | 🟢 Baja | ⬜ Pendiente |
| 3 | Blindar la cuenta y el dominio | 2FA en la cuenta nueva, bloqueo de transferencia y 2FA en el registrador, DNSSEC en la zona. Zone Hold solo existe en Enterprise (el error 1005 del API es esperado en Business), y Cloudflare confirmó que estas son las mitigaciones correctas en el plan actual. | 🟢 Baja | ⬜ Pendiente |
| 4 | Buzones en `.org` | Email Routing de Cloudflare reenvía `hola`, `privacidad`, `security`, `conducta` y `contacto` a un buzón del proyecto que no se publica. Sin costo y sin atar el dominio a ninguna cuenta de correo: mudarse a un Workspace propio más adelante es cambiar los MX. Los registros de Google que traía la zona se retiraron, y el dominio salió del Workspace donde estaba dado de alta. Recepción probada de punta a punta. Responder como esas direcciones depende de la tarea 5. | 🟢 Baja | ✅ Done |
| 5 | Dominio de envío en Resend | Alta en Resend (us-east-1, return-path `send`, sin rastreo de clics ni aperturas) con configuración manual: la automática pide permiso sobre la cuenta de Cloudflare y no hace falta para tres registros. DKIM y los dos CNAME de envío publicados sin proxy. Pendiente: que Resend marque el dominio verificado, y configurar en el buzón del proyecto el envío como cada dirección pública por el SMTP de Resend, con una llave dedicada solo a envío. | 🟢 Baja | 🟡 In progress |
| 6 | Widget de Turnstile en la cuenta nueva | Crear el widget con `araguaney.lat` **y** `araguaney.org` como hostnames, para que la llave nueva funcione en cualquiera de los dos dominios durante la transición. | 🟢 Baja | ⬜ Pendiente |

### Bloque B — La web

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 7 | Dominios en Vercel | Agregar `www.araguaney.org` (canónico) y `araguaney.org` (redirige con 308 a `www`, como hoy hace `.lat`). Registros DNS **sin proxy** en la zona nueva. A partir de aquí la web responde en los dos dominios; las etiquetas canónicas siguen apuntando a `.lat`, así que no hay contenido duplicado. En el mismo paso, `https://www.araguaney.org` se agrega **al final** de `FRONTEND_URL` en el backend: el CORS lo acepta y los enlaces de los correos siguen saliendo con `.lat`. | 🟢 Baja | ⬜ Pendiente |
| 8 | El dominio en un solo lugar del código | Estaba escrito a mano en unas 170 líneas. Ahora el backend lo lee de `SITE_DOMAIN` (`app/utils/branding.py`: `site_domain()` y `contact_email()`), que alimenta las plantillas de correo, los dos manifiestos y la etiqueta de tarima. El frontend lo deriva de `NEXT_PUBLIC_SITE_URL` (`SITE_DOMAIN` y `contactEmail()` en `src/lib/seo.ts`), y `llms.txt` y `llms-full.txt` pasaron de `public/` a rutas que arman sus enlaces desde `SITE_URL`, igual que el sitemap. Los textos legales declaran la titularidad de los dos dominios; su versión no sube porque cambiar una dirección de contacto no es un cambio material. Pruebas: `tests/test_site_domain.py` y `src/lib/__tests__/site-domain.test.ts`. **El valor por defecto ya es `.org`:** el backend cambia de dominio al desplegar este código, salvo que `SITE_DOMAIN` esté definida en Railway. | 🟠 Media | ✅ Done |
| 9 | Corte de la web | Un solo despliegue: el merge de la tarea 8 más `SITE_DOMAIN` en Railway (o su valor por defecto) y las variables de Vercel (`NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL` si está definida, las dos llaves de Turnstile) y, en el backend, `FRONTEND_URL` con `.org` **primero**: la primera entrada es la que arma los enlaces de los correos y los QR, y `.lat` se queda después para el CORS. Verificar: inicio de sesión, un formulario público con Turnstile, la ficha de QR, una captura. | 🟠 Media | ⬜ Pendiente |
| 10 | `.lat` redirige a `.org` | En Vercel, `araguaney.lat` y `www.araguaney.lat` pasan a redirigir con 308 a `www.araguaney.org`, conservando la ruta. Va **después** de verificar la tarea 9. Para deshacerlo basta con quitar la redirección. | 🟢 Baja | ⬜ Pendiente |
| 11 | Buscadores | Propiedad nueva en Google Search Console verificada por DNS en la zona nueva, aviso de cambio de dirección desde la propiedad vieja, envío del sitemap y flujo de Analytics con el dominio nuevo. La llave de IndexNow vive en `public/` y se muda sola. | 🟢 Baja | ⬜ Pendiente |

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

### Bloque G — Google y servicios de terceros

> Se ejecuta después del corte de la web: varias de estas consolas verifican el
> dominio nuevo contra la web ya publicada.

| # | Tarea | Descripción | Complejidad | Estado |
|---|---|---|---|---|
| 22 | Google Play Console | Ficha de la app: sitio web, correo de contacto y URL del aviso de privacidad al dominio nuevo. Si la app usa enlaces verificados, publicar `assetlinks.json` en el dominio nuevo antes de la versión que los declara. | 🟢 Baja | ⬜ Pendiente |
| 23 | Analytics y Sentry | URL del flujo web en Analytics; en Sentry, los dominios permitidos del proyecto web, si el filtro está activo. Verificar que llega un evento real desde `.org` a cada uno: un panel vacío se ve igual sano que mudo. | 🟢 Baja | ⬜ Pendiente |

## Lo que esta fase no hace

- **No proxia la web por Cloudflare.** Vercel no lo soporta, y forzarlo rompería
  su caché y sus certificados.
- **No usa Cloudflare for SaaS.** Está disponible en Business y serviría si algún
  día un centro quisiera operar con su propio dominio, pero hoy nadie lo pide.
- **No cambia el nombre del producto, el repositorio ni la organización de
  GitHub** (`araguaney-lat`). Son identificadores, no el dominio, y moverlos no
  agrega protección.
