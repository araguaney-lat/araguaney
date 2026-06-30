### Fase 7 — Transferencias entre centros ⬜

---

#### Principios de diseño

Los centros de acopio tienen inventarios desbalanceados: uno acumula ibuprofen, otro no tiene nada. Las transferencias permiten mover cajas selladas de un centro a otro manteniendo trazabilidad completa — el QR de cada caja sobrevive la transferencia y su historial refleja por dónde pasó.

**Quién puede iniciar:**
- `national_admin`: cualquier transferencia entre cualquier par de centros, en cualquier dirección
- `coordinator`: puede iniciar dos tipos:
  - **Push** — quiero enviar cajas de mi centro a otro centro
  - **Pull** — quiero recibir cajas de otro centro (solicitud de entrada)

**Aprobación:**
- La aprobación siempre viene del **centro origen** (su coordinator) o del `national_admin`
- Si el coordinator del centro origen crea el transfer (push), sigue requiriendo confirmación explícita antes del despacho para garantizar el audit trail
- El `national_admin` puede aprobar cualquier transferencia sin necesidad del coordinator origen

**Máquina de estados:**

```
REQUESTED ──► APPROVED ──► IN_TRANSIT ──► RECEIVED
          └──► REJECTED
```

| Transición | Quién puede hacerla |
|---|---|
| `REQUESTED → APPROVED` | Coordinator del centro origen · national_admin |
| `REQUESTED → REJECTED` | Coordinator del centro origen · national_admin |
| `APPROVED → IN_TRANSIT` | Coordinator del centro origen · national_admin |
| `IN_TRANSIT → RECEIVED` | Coordinator del centro destino · national_admin |

**Qué cajas pueden transferirse:**
- Solo cajas con status `SEALED`
- No pueden estar asignadas a una tarima (`pallet_id IS NULL`) ni a un envío activo

**Efecto al recibir (`RECEIVED`):**
- `Box.center_id` cambia al centro destino — mutación controlada y única permitida en `center_id`
- Status de la caja permanece `SEALED` (la caja no se abre, sigue lista para usar)
- Se escribe un `BoxEvent` de tipo `TRANSFERRED` con metadata `{from_center_id, to_center_id, transfer_id}`
- El QR de la caja sigue siendo válido; al escanearlo muestra el historial completo incluida la transferencia

---

#### Backend — Modelos y migración

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Migración `0NN_transfers` | Tabla `transfers(id, from_center_id FK, to_center_id FK, status, initiated_by FK, notes, created_at, updated_at)`; tabla `transfer_items(id, transfer_id FK, box_id FK)`; tabla `transfer_events(id, transfer_id FK, from_status, to_status, user_id FK, created_at)`; índices en `(from_center_id)`, `(to_center_id)`, `(status)` | 🟠 | ⬜ Pendiente |
| 2 | Modelos SQLAlchemy | `Transfer`, `TransferItem`, `TransferEvent`; importar en `alembic/env.py` | 🟡 | ⬜ Pendiente |
| 3 | `TransferRepository` | Extiende `TenantRepository`; `list_by_center(center_id)` retorna transfers donde `from_center_id = center_id OR to_center_id = center_id`; `national_admin` ve todos; `find_with_items(transfer_id)` carga cajas incluidas | 🟠 | ⬜ Pendiente |
| 4 | `TransferService` — crear | Valida que todas las cajas sean `SEALED` y sin tarima activa; valida que pertenezcan al centro origen; no permite duplicar cajas en transfers concurrentes; escribe `TransferEvent REQUESTED` | 🟠 | ⬜ Pendiente |
| 5 | `TransferService` — máquina de estados | Métodos `approve`, `reject`, `dispatch`, `receive`; cada uno valida el rol y el centro del usuario; `receive` muta `Box.center_id` + escribe `BoxEvent TRANSFERRED`; todos escriben `TransferEvent` | 🟠 | ⬜ Pendiente |

---

#### Auditoría — Eventos de Fase 7

Las transferencias tienen su propia tabla `transfer_events` (estado a estado + usuario + timestamp). Adicionalmente, cada transición escribe en `audit_log` vía `fire_audit` para que el `national_admin` lo vea en `/studio/audit` junto al resto de eventos del sistema:

| Evento `audit_log` | Cuándo | Metadata |
|---|---|---|
| `TRANSFER_CREATED` | Transfer creado | `{from_center_id, to_center_id, box_count, initiated_by_role}` |
| `TRANSFER_APPROVED` | `REQUESTED → APPROVED` | `{transfer_id, approved_by_role}` |
| `TRANSFER_REJECTED` | `REQUESTED → REJECTED` | `{transfer_id, reason}` |
| `TRANSFER_DISPATCHED` | `APPROVED → IN_TRANSIT` | `{transfer_id, box_count}` |
| `TRANSFER_RECEIVED` | `IN_TRANSIT → RECEIVED` | `{transfer_id, from_center_id, to_center_id, box_count}` |
| `BOX_TRANSFERRED` | Por cada caja al recibir | `{box_id, from_center_id, to_center_id, transfer_id}` — un evento por caja |

> `TransferEvent` registra la secuencia operativa del transfer. `audit_log` centraliza todo en un solo lugar visible para el admin. Ambas tablas se escriben en cada transición.

---

#### Backend — Endpoints

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 6 | `POST /v1/transfers` | Crear transferencia; body: `{from_center_id, to_center_id, box_ids[], notes}`; coordinator solo puede crear si su `center_id` es origen o destino; national_admin puede crear cualquiera | 🟡 | ⬜ Pendiente |
| 7 | `GET /v1/transfers` | Listar; coordinator ve solo las de su centro (origen o destino); national_admin ve todas; filtros: `status`, `from_center_id`, `to_center_id`, `from_date` | 🟡 | ⬜ Pendiente |
| 8 | `GET /v1/transfers/{id}` | Detalle con items (cajas) y eventos de estado | 🟢 | ⬜ Pendiente |
| 9 | `POST /v1/transfers/{id}/approve` | `REQUESTED → APPROVED`; solo coordinator del centro origen o national_admin | 🟡 | ⬜ Pendiente |
| 10 | `POST /v1/transfers/{id}/reject` | `REQUESTED → REJECTED`; mismos permisos que approve; body: `{reason}` opcional | 🟡 | ⬜ Pendiente |
| 11 | `POST /v1/transfers/{id}/dispatch` | `APPROVED → IN_TRANSIT`; solo coordinator del centro origen o national_admin; confirma que las cajas físicamente salieron | 🟡 | ⬜ Pendiente |
| 12 | `POST /v1/transfers/{id}/receive` | `IN_TRANSIT → RECEIVED`; solo coordinator del centro destino o national_admin; muta `Box.center_id`; escribe `BoxEvent TRANSFERRED` por cada caja | 🟠 | ⬜ Pendiente |
| 13 | `GET /v1/transfers/{id}/manifest` — PDF | Manifiesto PDF de la transferencia: origen, destino, lista de cajas (producto, lote, cantidad, QR), fecha; encolado en ARQ; autenticado + rate-limited | 🟠 | ⬜ Pendiente |

---

#### Backend — Notificaciones

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 14 | Email al crear transferencia | Al crear: notifica por email al coordinator del centro que NO inició (origen si pull, destino si push); asunto: "Nueva solicitud de transferencia desde [Centro X]" | 🟡 | ⬜ Pendiente |
| 15 | Email al aprobar / rechazar | Notifica al initiator cuando la transferencia es aprobada o rechazada | 🟡 | ⬜ Pendiente |
| 16 | Email al recibir | Notifica al coordinator del centro origen que las cajas fueron recibidas | 🟢 | ⬜ Pendiente |

---

#### Frontend — Dashboard operativo

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 17 | Lista de transferencias `/dashboard/transfers` | Dos pestañas: "Enviando" (from_center = mi centro) y "Recibiendo" (to_center = mi centro); estado visual con badge de color; acceso rápido a la acción pendiente (aprobar / despachar / confirmar recepción) | 🟠 | ⬜ Pendiente |
| 18 | Crear transferencia — selección de cajas | Formulario: seleccionar centro destino + filtrar/seleccionar cajas selladas disponibles (búsqueda por producto, cantidad); preview de lo que se enviará | 🟠 | ⬜ Pendiente |
| 19 | Panel de detalle de transferencia | Vista de estado, lista de cajas incluidas, historial de eventos, botones de acción según rol y estado actual | 🟡 | ⬜ Pendiente |
| 20 | Enlace a manifiesto PDF | Botón "Descargar manifiesto" disponible desde `APPROVED` en adelante | 🟢 | ⬜ Pendiente |

---

#### Frontend — Studio (national_admin)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 21 | Vista de transferencias en Studio `/studio/transfers` | Todas las transferencias del sistema; filtros por centro, estado, fecha; puede aprobar, rechazar, despachar y recibir cualquier transferencia | 🟡 | ⬜ Pendiente |

---

> **Decisiones de diseño:**
> - `Box.center_id` es el único campo "inmutable" que cambia — solo ocurre en `RECEIVED` y queda documentado en `BoxEvent TRANSFERRED`.
> - Las cajas en una transferencia `IN_TRANSIT` no pueden usarse en intake ni palet hasta que se reciban o la transferencia sea cancelada.
> - No existe "cancelar" después de `IN_TRANSIT` — si el camión ya salió, hay que recibirlas en destino y crear una transferencia de vuelta si es necesario.
> - El manifiesto de transferencia es distinto al manifiesto de envío (Shipment) — este queda en el sistema como evidencia interna entre centros, no va a aduana.
