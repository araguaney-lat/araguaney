# Pruebas end-to-end: guion completo

Guion de QA para recorrer la aplicación entera, en orden, con los estados
esperados en cada paso. Para la versión narrada y sin detalle técnico, ver
[recorrido-operativo.md](./recorrido-operativo.md).

Cada bloque indica el rol mínimo requerido, la pantalla, el endpoint que se
ejercita y el estado resultante. Los códigos de error listados son los que se
deben poder provocar a propósito.

> **Cuentas de prueba:** no se documentan aquí. Ver [SECURITY.md](../../SECURITY.md)
> para la política de cuentas de prueba en producción.

---

## Invariantes que la prueba debe confirmar

1. La caja **no se crea directamente**. No existe `POST /v1/boxes`: una caja nace
   de un intake.
2. Solo cajas `SEALED` entran a una tarima; solo tarimas `CLOSED` entran a un
   envío.
3. `SHIPPED` congela en cascada: envío, tarimas y cajas.
4. Todo cambio de estado escribe su evento (`BoxEvent`, `PalletEvent`,
   `ShipmentEvent`, eventos de donación y de transferencia).
5. Ningún dato cruza de un centro a otro sin pasar por una transferencia
   explícita.

---

## Fase 0 · Preparación (una sola vez)

### 0.1 Centros — `national_admin`

- [ ] **Centros** → `POST /v1/centers`. Capturar también `legal_name`, `tax_id` y
      `address`: alimentan la declaración de mercancías del envío.
- [ ] Camino alterno: `/registrar-centro` (público) → **Solicitudes de centro** →
      aprobar. Requiere `require_application_reviewer` (national_admin o superadmin).

### 0.2 Usuarios

- [ ] `superadmin` en `/studio/users` crea el `national_admin`.
- [ ] `national_admin` en **Usuarios** crea `coordinator` y `volunteer` de
      cualquier centro.
- [ ] `coordinator` en **Equipo** crea `volunteer`, **solo de su centro**.
      Verificar el 403 al intentar otro centro.
- [ ] Primer login del usuario nuevo: clave temporal → `must_change_password`
      fuerza `/change-password` → `/accept-terms` → `/dashboard`.

### 0.3 Catálogo — `national_admin` (bloqueante)

- [ ] **Catálogo → Nuevo** → `POST /v1/product-types`. Exige
      `require_national_admin`: confirmar que `coordinator` y `volunteer` reciben
      403. Ellos solo consultan (`GET /v1/catalog/search`).
- [ ] Sembrar al menos: un medicamento completo (`inn_name`, `form`, `strength`),
      un alimento, un producto con `is_controlled = true` y uno con
      `min_shelf_life_days` propio. Se necesitan los cuatro para los casos de
      rechazo.
- [ ] Opcional: producto acotado a una campaña y luego
      `POST /v1/product-types/{id}/promote` para volverlo global.

### 0.4 Campaña — `national_admin`

- [ ] **Campañas** → `POST /v1/campaigns` con `name`, `origin_country`,
      `destination_country`, fechas y `center_ids`. Con `center_ids`, todos los
      usuarios activos de esos centros quedan inscritos como miembros.
- [ ] `PATCH /v1/campaigns/{id}` para `weight_goal_kg` y `is_active`.
- [ ] **Miembros de campaña**: un `coordinator` solo puede agregar usuarios de su
      propio centro (403 en caso contrario). La campaña `is_general` no permite
      quitar miembros (`PROTECTED_CAMPAIGN`).

**Caso negativo obligatorio:** capturar un intake con `campaign_id` de una
campaña donde el usuario **no** es miembro → `403 NOT_CAMPAIGN_MEMBER`. Es la
causa raíz de "no veo campañas" y "el reporte sale vacío".

---

## Fase 1 · Pre-registro del donante (opcional, Fase 18)

Público, sin auth, protegido con Turnstile y rate limit.

- [ ] `/donar` → `POST /v1/public/donations` → `202`. Estado `PENDING_EMAIL`.
      La respuesta no revela si el correo existe.
- [ ] Confirmar desde el correo → `POST /v1/public/donations/confirm` → estado
      `REGISTERED`, se emite el código `DN-XXXXXX`.
- [ ] Reenvío: `POST /v1/public/donations/resend`. El enlace anterior deja de
      servir.
- [ ] Autogestión con el token del correo (`/donacion/{token}`):
      `GET/POST /v1/public/donations/manage/{token}` para editar renglones,
      subir y borrar fotos, y cancelar (`CANCELLED`).
- [ ] Ficha pública del QR: `GET /v1/d/{code}`. Debe dar 404 si la donación está
      en `PENDING_EMAIL`, `EXPIRED` o `CANCELLED`.

---

## Fase 2 · Recepción

### 2.1 Con pre-registro — `volunteer`

- [ ] **Escanear** el QR `DN-` → detalle en `/dashboard/donations/{code}`.
- [ ] Doble check → `POST /v1/donations/{code}/receive`. El cuerpo lleva **solo
      las excepciones** (renglones que faltaron o llegaron dañados) más los
      extras que trajo la persona. Lo no marcado se da por recibido.
- [ ] Resultado: estado `RECEIVED`, `received_center_id` es el centro que
      recibió (puede diferir del que eligió el donante), `manage_token_hash` se
      anula y sale el correo de resumen.
- [ ] Caso negativo: recibir dos veces → `409 NOT_RECEIVABLE`.
- [ ] El botón de captura navega a `/dashboard/intake/new?donation={code}`, que
      precarga el donante. Confirmar que **no** se crea un donante duplicado.

### 2.2 Captura — `volunteer`

- [ ] **Recepción → Nueva** → `POST /v1/intakes`. Un renglón del formulario es
      **una caja**: producto, `quantity`, `unit`, `batch`, `expiry_date`,
      `weight_kg`, y opcionalmente el `gtin` leído (no se guarda en la caja, el
      catálogo aprende de él).
- [ ] Búsqueda de producto por texto, por código de barras tecleado y por cámara.
- [ ] Sin bloque `donor` la donación es anónima (default del dominio). Con la
      casilla activa se captura el donante; si es `moral` y no acepta términos →
      `TERMS_NOT_ACCEPTED`.
- [ ] Resultado: 1 `Intake` + N cajas `BX-XXXXXX`, cada una con su `BoxEvent`
      inicial.

### 2.3 Validación automática

Cada caja queda `DRAFT` o `REJECTED`. Provocar los cinco rechazos:

- [ ] Producto con `is_controlled = true`.
- [ ] Medicamento con menos de 365 días de vida útil restante.
- [ ] Alimento o agua con menos de 180 días (o el `min_shelf_life_days` del SKU).
- [ ] Falta `expiry_date` donde la categoría la exige.
- [ ] Medicamento sin `batch`, o cuyo `ProductType` no tiene `inn_name` / `form`
      / `strength`.

### 2.4 Escalamiento por volumen (Fase 20)

El umbral vive en variables de entorno y **no se documenta aquí** (ver
`app/utils/volume.py` y `.env.example`).

- [ ] Capturar por encima del umbral, sin donante y sin motivo →
      `DONOR_REQUIRED_FOR_VOLUME`.
- [ ] Repetir identificando al donante → pasa.
- [ ] Repetir con `anonymous_exception_reason` → pasa **y** abre un `RiskReview`
      en `PENDING`. El escalamiento no es un tope: exige identificar, no impide
      donar.
- [ ] Un intake que viene de una donación pre-registrada no dispara el umbral: ya
      hay identidad.

### 2.5 Revisiones — `coordinator` o `national_admin`

- [ ] **Revisiones** → `GET /v1/risk-reviews` (pendientes, con scope de centro) →
      `POST /v1/risk-reviews/{id}/resolve` con `APPROVED` o `REJECTED`.
- [ ] Separación de funciones: quien abrió la revisión no puede resolverla →
      `403 SELF_REVIEW`. El `national_admin` es la excepción, porque es el
      escalamiento final.
- [ ] Un `coordinator` de otro centro recibe `404`, no `403`: no debe poder
      inferir qué se revisa fuera de su centro.
- [ ] Rechazo sin nota → `REASON_REQUIRED`.
- [ ] `volunteer` → 403.

---

## Fase 3 · Caja — `volunteer`

- [ ] **Cajas** → `POST /v1/boxes/{id}/seal`: `DRAFT → SEALED`. Revalida los
      requisitos de medicamento (`MISSING_FIELDS`, `MISSING_BATCH`,
      `MISSING_EXPIRY`).
- [ ] Sellar una caja `REJECTED` o ya `SEALED` → `INVALID_TRANSITION`.
- [ ] Etiquetas: `POST /v1/boxes/labels/pdf` → `202` con `job_id` → encolado en
      ARQ → poll `GET /v1/exports/{job_id}` → descarga. Nunca es inline.
- [ ] Ficha pública: `/b/{code}` sin sesión. Verificar que no filtra datos del
      donante.
- [ ] Historial: `GET /v1/boxes/{id}/events`.

---

## Fase 4 · Tarima — `coordinator`

- [ ] `volunteer` → 403 en todo el bloque (`require_coordinator`).
- [ ] `POST /v1/pallets` → código `TM-XXXXXX`, estado `OPEN`. Un `national_admin`
      debe elegir centro; el `coordinator` usa el suyo.
- [ ] `POST /v1/pallets/{id}/add-box` por **código de caja**. Casos negativos:
      caja no `SEALED`, caja de otro centro, caja ya en otra tarima.
- [ ] `DELETE /v1/pallets/{id}/boxes/{code}` mientras esté `OPEN`.
- [ ] `POST /v1/pallets/{id}/close` con `gross_weight_kg` y `height_cm`
      opcionales: `OPEN → CLOSED`. Cerrar vacía → `EMPTY_PALLET`.
- [ ] El pesaje **no bloquea**: cerrar sin peso debe funcionar (una báscula rota
      no detiene una tarima armada).
- [ ] Verificar los tres niveles de peso y que la diferencia se muestre sin
      bloquear: referencia de catálogo (solo contenido), caja pesada, tarima
      pesada (incluye base y emplaye, por eso no es la suma de sus cajas).
- [ ] Etiqueta: `POST /v1/pallets/{id}/label.pdf` → job ARQ.

---

## Fase 5 · Envío y documentos — `coordinator`

- [ ] `POST /v1/shipments`: `campaign_id`, `destination`, `carrier`, `reference`,
      `height_profile`. Estado `OPEN`.
- [ ] `POST /v1/shipments/{id}/add-pallet`: solo tarimas `CLOSED` y sin envío
      (`PALLET_NOT_CLOSED`, `PALLET_ALREADY_IN_SHIPMENT`).
- [ ] Tarima más alta que el `height_profile` → aparece en `height_warnings`.
      **Avisa, no bloquea.**
- [ ] `POST /{id}/close`: `OPEN → CLOSED`. Sin tarimas → `EMPTY_SHIPMENT`.
- [ ] `POST /{id}/ship`: `CLOSED → SHIPPED`. Verificar la cascada: todas las
      tarimas y todas sus cajas quedan `SHIPPED`. Después de esto, cualquier
      edición debe fallar.
- [ ] Documentos, todos encolados en ARQ y con poll de export:
      - `POST /{id}/manifest.pdf`
      - `POST /{id}/manifest.xlsx`
      - `POST /{id}/declaracion.xlsx`
      - `POST /{id}/declaracion.json`
- [ ] En la declaración: `legal_name`, `tax_id` y `address` del centro se
      imprimen **tal cual**, sin validación de formato (un RFC, un RIF y un EIN
      no se parecen). El código de mercancía es HS, no un catálogo de un país.

---

## Fase 6 · Transferencias entre centros

- [ ] `POST /v1/transfers` con cajas `SEALED`, del centro origen, sin tarima y
      sin transferencia activa. Casos negativos: `SAME_CENTER`, `BOX_NOT_SEALED`,
      `BOX_IN_PALLET`, `409` por transferencia duplicada.
- [ ] Máquina de estados: `REQUESTED → APPROVED → DISPATCHED → RECEIVED`, más
      `REJECTED` desde `REQUESTED`.
- [ ] Aprobar, rechazar y despachar: **solo el coordinador del centro origen**.
- [ ] Recibir: **solo el coordinador del centro destino**.
- [ ] `POST /v1/transfers/{id}/manifest.pdf`.

---

## Fase 7 · Reportes y agregados

### Reportes de campaña

- [ ] **Reportes**: la campaña sale de las campañas del usuario; un
      `national_admin` ve todas.
- [ ] Resumen, actividad, desglose por categoría y por centro, países, y
      exportación CSV encolada.
- [ ] Acceso: quien no es miembro de la campaña recibe `403`, salvo
      `national_admin`.

Dos comportamientos que se leen como bug y no lo son:

- Rango por defecto: **últimos 30 días**, tope de 366. Datos sembrados con fechas
  viejas no aparecen.
- Agrupa por fecha de **captura** de la caja, no por sellado ni por envío, y por
  la campaña del intake. Una caja capturada sin campaña explícita cae en
  Donaciones Generales.

### Panel nacional y público

- [ ] `/dashboard/national`: agregado por categoría y por centro, más avance de
      peso contra la meta.
- [ ] `/necesidades` y `GET /v1/public/needs`: stock `SEALED` por categoría, sin
      nombres de centro. Verificar los headers de cache.
- [ ] `/eventos/{slug}` para campañas con slug público.
- [ ] `/qr/{code}` resuelve caja o tarima y localiza las etiquetas por
      `Accept-Language`.

### Auditoría

- [ ] **Auditoría** (national_admin) y `/studio/audit` (superadmin): confirmar
      que aparecen creación de usuarios, resolución de revisiones, cambios de
      estado y accesos sensibles.

---

## Regresiones a verificar en cada corrida

Los prefijos de código son `BX-` (caja), `TM-` (tarima) y `DN-` (donación
pre-registrada). Dos rutas dependen de eso y ya se rompieron una vez:

- [ ] **Etiqueta física de tarima.** El PDF codifica `{FRONT}/p/{code}`
      (`app/utils/qr.py`, `app/utils/pdf_pallet_label.py`). Esa ruta no tiene
      página propia: `next.config.ts` la redirige (307) a `/qr/{code}`, que es
      la ficha que resuelve caja y tarima. Escanear una etiqueta impresa debe
      abrir la ficha, no un 404.
- [ ] **Escáner manual** (`/dashboard/scan`): tecleando `BX-…` cae en `/b/`,
      `TM-…` en `/qr/`, `DN-…` en el detalle de la donación. Probar también en
      minúsculas: el código se normaliza a mayúsculas.

Y una limitación operativa que no es bug pero muerde en demo:

- **El catálogo es cuello de botella.** Solo `national_admin` da de alta
  productos. Si falta un SKU durante una captura en vivo, nadie más lo
  desbloquea.

---

## Orden mínimo para una demo

Centros y catálogo → campaña con miembros → pre-registro de una donación →
recepción (incluyendo un rechazo a propósito) → sellado y etiqueta → tarima
cerrada con peso → envío despachado con manifiesto → reporte de la campaña.
