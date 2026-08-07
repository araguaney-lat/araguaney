# Captura sin conexión: cola local y sincronización diferida — Diseño

**Fecha:** 2026-08-07
**Fase:** 25 (`docs/roadmap/phase-25-offline-capture.md`)
**Estado:** propuesto, pendiente de aprobación
**Origen:** el equipo que operará la aplicación reporta que muchos centros de
acopio trabajan en sótanos y bodegas con cobertura pésima o nula.
**Relación:** la Fase 4 (task 3) dejó el service worker y el shell cacheado, y
anotó explícitamente "sync diferido (IndexedDB) en Fase 5". Nunca se hizo. Esta
fase es esa deuda, con dos años de dominio encima que cambian el diseño.

---

## Problema

La aplicación **abre** sin conexión. No **guarda**.

El service worker cachea el shell y la navegación cae a `/offline`; el banner de
conectividad avisa; el escaneo de código de barras degrada con un `503` honesto.
Todo eso ya funciona. Pero en `frontend/public/sw.js`:

```js
if (event.request.method !== "GET") return
```

Cualquier escritura queda fuera. Un `POST /v1/intakes` en un sótano falla y **la
captura se pierde**, que es justo el momento en que alguien tiene una fila de
gente esperando y una caja abierta en las manos.

## La pregunta que ordena toda la fase

*¿Estos problemas desaparecen cuando exista la app nativa?*

**Solo uno de los tres.** Vale la pena separarlos porque determina qué trabajo es
permanente y cuál es desechable.

| Problema | ¿Lo resuelve ser nativo? | Por qué |
|---|---|---|
| **Idempotencia** | **No** | Es un problema de sistemas distribuidos, no de plataforma. Si la petición llega y la respuesta se pierde, el reintento duplica, sea desde Swift, Kotlin o un navegador. La red no distingue clientes |
| **Códigos de caja** | **No** | El código `BX-` lo genera el servidor para garantizar unicidad entre centros. Una app nativa tampoco puede inventarlo sin arriesgar colisión. Es una decisión de dominio |
| **Persistencia y despertar** | **Sí, en parte** | SQLite no se purga; el navegador sí puede desalojar IndexedDB. `WorkManager` y `BGTaskScheduler` despiertan con más garantías que la Background Sync API |

**Esto tiene una consecuencia práctica que conviene decidir con ella delante:**
dos de las tres piezas son **inversión permanente**. La llave de idempotencia y
la estrategia de códigos viven en el backend y la app nativa las va a necesitar
igual; construirlas ahora no es trabajo que se tire. Lo único que se reescribiría
es la capa de almacenamiento local y el disparo de sincronización, que es la más
pequeña de las tres.

Dicho de otro modo: **esperar a la app nativa no evita este trabajo, solo lo
retrasa** y deja mientras tanto una captura que se pierde.

Y el matiz incómodo: iOS restringe la ejecución en segundo plano también a las
apps nativas. Una nativa sincroniza mejor que una web, no perfectamente.

---

## Decisiones

### 1. La idempotencia va primero, y sola si hace falta

**Encolar sin idempotencia es peor que no encolar.** Sin ella, un reintento
convierte "se perdió una captura" en "hay inventario fantasma": cajas duplicadas
que nadie audita, que inflan el stock nacional y que aparecen en un manifiesto
ante una aduana.

- El cliente genera un **UUID de captura** (`capture_id`) *antes* de intentar
  enviar, y lo conserva en la cola. Todo reintento lleva el mismo.
- `intakes` gana una columna `capture_id` **única y nullable**. Nullable porque
  las capturas en línea de hoy no lo tienen y no vamos a inventarles uno.
- Si llega un `capture_id` ya visto, el servidor **devuelve el intake existente**
  con `200` en lugar de crear otro. No es un error: es la respuesta correcta a
  "esto ya lo registraste".

La unicidad la sostiene la base, no una comprobación en el servicio. Dos
peticiones simultáneas de un cliente que reintenta agresivamente son un caso
real, y una comprobación previa a la escritura tiene una carrera en medio.

### 2. Los códigos de caja se pre-asignan

`_box_code()` genera `BX-` + `secrets.token_urlsafe(6)` en el servidor. Sin red
no hay código, y **sin código no hay etiqueta que imprimir**, que es lo que se
hace en el andén.

**Se pre-asigna un bloque de códigos** cuando hay conexión: el cliente pide N
códigos reservados, los guarda en la cola local y los consume al capturar
offline. La caja tiene su código y su QR desde el primer momento.

Las alternativas y por qué no:

- *Que el cliente genere un UUID como código*: rompe la etiqueta. Un `BX-` corto
  se teclea a mano cuando el escáner falla; un UUID no.
- *Imprimir después*: obliga a volver a tocar cada caja ya cerrada. En un centro
  con prisa, eso no ocurre.

Un bloque reservado y no usado no estorba: son filas marcadas como disponibles,
no cajas.

### 3. Qué se puede hacer sin conexión, y qué no

Ser explícito aquí evita prometer de más, que es como se pierde la confianza en
una herramienta durante una emergencia.

| Acción | Offline | Por qué |
|---|---|---|
| Capturar una donación (intake + cajas) | **Sí** | Es el cuello de botella y el objetivo de la fase |
| Elegir producto del catálogo | **Sí** | El catálogo se cachea en IndexedDB al iniciar sesión |
| Imprimir etiqueta | **Sí**, con código pre-asignado | El QR se dibuja en el cliente; el PDF en lote sigue siendo del servidor |
| Buscar por código de barras externo | **No** | Ya degrada con `503`; el comportamiento actual es correcto |
| Sellar una caja | **No** | La máquina de estados vive en el servidor y valida contra datos que el cliente no tiene |
| Armar tarimas y envíos | **No** | Requiere el estado de otras cajas, posiblemente capturadas por otra persona |
| Cualquier cosa con IA | **No** | Ya lo impide `ensure_available` |

La captura es la única escritura que se encola. Añadir más superficie multiplica
los conflictos de sincronización sin resolver el problema que motivó la fase.

### 4. La cola es visible o no sirve

Una cola invisible es peor que no tenerla: alguien captura veinte cajas, cierra
la aplicación creyendo que guardó, y el dato existe solo en un teléfono.

- Contador permanente en el panel: **"3 capturas pendientes de sincronizar"**.
- Cada captura encolada se ve en la lista de recepciones, marcada como pendiente.
- Al sincronizar bien, desaparece la marca. Al fallar de forma definitiva (el
  servidor la rechaza por regla de negocio), **queda para revisión humana**, no
  se descarta en silencio.

Ese último caso es real: una caja capturada offline con caducidad a 200 días pasa
la validación del cliente y la rechaza el servidor. La respuesta correcta no es
perderla, es mostrarla.

### 5. iOS, dicho sin optimismo

El soporte de la Background Sync API es desigual entre navegadores, y Safari
históricamente no la implementa. Además iOS desaloja el almacenamiento de sitios
que no se visitan durante un tiempo.

**Hay que verificar el estado actual antes de implementar**, no asumir lo que era
cierto hace un año. Con ese dato en mano, el plan es:

- Donde haya Background Sync, se usa: sincroniza aunque la pestaña esté cerrada.
- Donde no, se sincroniza al volver la conexión **con la aplicación abierta** y al
  abrirla. Menos garantías, mismo código de sincronización.
- **La interfaz avisa cuando hay cola pendiente y la app se va a cerrar**, porque
  en ese escenario la única garantía real es que alguien lo sepa.
- El manual dice qué hacer: al salir del sótano, abrir la aplicación y esperar a
  que el contador llegue a cero.

Es una limitación honesta, no un fallo que se pueda ocultar con más código.

---

## Modelo nuevo

```
intakes
  + capture_id UUID unique nullable    ← llave de idempotencia del cliente

box_code_reservations                  ← bloque pre-asignado por centro
  id, code unique, center_id FK,
  reserved_by_user_id FK, reserved_at,
  used_at nullable, box_id FK nullable
```

Nada más. La cola vive en el cliente (IndexedDB); replicarla en el servidor sería
duplicar el estado que la fase existe para sincronizar.

---

## Qué NO entra (YAGNI)

- **Resolución de conflictos.** Una captura no colisiona con otra: cada una crea
  filas nuevas. No hay edición offline de algo existente, y por eso no hay
  conflicto que resolver.
- **Edición offline** de cajas ya capturadas. Se captura o no se captura.
- **Sincronización de lectura**: el panel nacional, los reportes y las
  transferencias siguen exigiendo conexión. Son consulta, no captura.
- **Cifrado de la cola local.** No hay PII de beneficiario, y la del donante es
  opcional. Si se agrega, se reevalúa.
- Reintentos infinitos: tras N fallos, la captura pasa a revisión humana.

---

## Testing

- Idempotencia: el mismo `capture_id` dos veces devuelve el mismo intake y **no**
  crea cajas nuevas. Incluye el caso de dos peticiones concurrentes.
- La restricción única existe en la base, no solo en el servicio.
- Un código pre-asignado se consume una vez; consumirlo dos veces falla.
- Un bloque reservado y nunca usado no aparece como inventario en ningún reporte.
- Una captura offline rechazada por regla de negocio queda visible para revisión,
  no se descarta.
- El aislamiento entre centros se mantiene: un código reservado por A no lo puede
  consumir B.

## Definition of Done de la fase

- Una captura hecha sin conexión llega íntegra al servidor cuando vuelve la red.
- Reintentar una sincronización nunca duplica inventario.
- Una caja capturada offline tiene código y etiqueta imprimible en el momento.
- La cola pendiente es visible en todo momento y nada se descarta en silencio.
- Con conexión permanente, la aplicación se comporta exactamente como hoy.
