# Trazabilidad extendida: avión y destino — Diseño

**Fecha:** 2026-07-29
**Fase:** 22 (`docs/roadmap/phase-22-extended-traceability.md`)
**Estado:** aprobado en sesión de diseño
**Relación:** la diferencia de peso enviado/recibido usa la báscula por tarima
de la Fase 21 cuando existe; el email opcional al donante ("tu donación llegó")
es el gancho de la task 21 de la Fase 18. Ninguna es bloqueante.

---

## Problema

La trazabilidad termina hoy en `SHIPPED`: el envío sale y el sistema se queda
ciego. No hay forma de registrar qué llegó, qué se perdió en aduana o en el
camino (merma), ni diferencias de peso entre lo despachado y lo recibido. Para
un flujo humanitario con escrutinio aduanal, el tramo México → destino es
exactamente donde la trazabilidad más importa.

## Las tres premisas, contra el sistema real

| Premisa | Situación |
|---|---|
| "La trazabilidad debe ser por eventos discretos, no por horarios continuos" | **Ya es la arquitectura.** `BoxEvent`/`PalletEvent`/`ShipmentEvent` registran transiciones discretas (from → to + usuario + ts) desde la Fase 3. Es el mismo modelo del estándar GS1 EPCIS (eventos qué/cuándo/dónde/por qué) y del rastreo por consignación con QR que documenta OCHA. Esta fase no cambia el modelo: **amplía el vocabulario** con hitos logísticos |
| "Módulo de recepción en destino para registrar merma" | No existe nada después de `SHIPPED`. Se añade recepción reconciliada caja por caja |
| "Apartado de incidencias (peso, cajas faltantes)" | No existe. Se añade, ligado a la recepción y al envío |

## Decisión tomada

**Quién registra en destino:** `national_admin`, con base en el reporte del
consignatario (acta, fotos, mensaje — el canal que la conectividad permita).
Cero superficie nueva de autenticación; funciona con la realidad de una zona de
desastre. La evolución (enlace firmado para que el consignatario capture de
primera mano, patrón Fase 18) queda anotada como no-objetivo de hoy.

## Máquina de estados extendida

```
Shipment: OPEN → CLOSED → SHIPPED → DELIVERED → RECONCILED
                              │          │           │
                              │          │           └─ recepción registrada,
                              │          │              merma reconciliada
                              │          └─ llegó a destino (national_admin)
                              └─ hitos discretos sin cambio de estado
```

- **`DELIVERED`** — el envío llegó al punto de entrega. **`RECONCILED`** — la
  recepción quedó registrada caja por caja. Ambas transiciones escriben su
  `ShipmentEvent`, como todo.
- **Hitos** (`shipment_events.milestone`, nueva columna nullable con CHECK):
  `DEPARTED_WAREHOUSE`, `ARRIVED_AIRPORT`, `LOADED_AIRCRAFT`, `DEPARTED_FLIGHT`,
  `ARRIVED_DESTINATION`, `CUSTOMS_CLEARED`, `DELIVERED_CONSIGNEE`. Un hito es un
  evento con `from_status = to_status`: registra el suceso sin inventar estados
  intermedios. El timeline del envío los muestra intercalados.
- **Las cajas y tarimas siguen congeladas en `SHIPPED`.** El invariante del
  `CLAUDE.md` ("al SHIPPED se congela todo") no se toca: lo que se despachó es
  un registro inmutable. Lo que pasó en destino vive en tablas de recepción,
  nunca como mutación retroactiva del inventario despachado. Enviado vs
  recibido son dos hechos distintos y el sistema los guarda como tales.

## Modelo nuevo

```
shipment_receptions          ← una por envío (MVP)
  id, shipment_id FK unique, received_by_user_id FK,
  received_at, consignee_name nullable, notes,
  created_at, updated_at

reception_lines              ← una por caja del envío
  id, reception_id FK, box_id FK,
  outcome CHECK (RECEIVED | MISSING | DAMAGED | RETAINED_CUSTOMS),
  note nullable

incidents
  id, shipment_id FK, pallet_id FK nullable, box_id FK nullable,
  type CHECK (WEIGHT_DIFF | MISSING_BOX | DAMAGE | CUSTOMS_RETENTION | OTHER),
  description, status CHECK (OPEN | RESOLVED),
  created_by_user_id, resolved_by_user_id nullable, resolved_at nullable,
  created_at
```

Opcional en la recepción: peso bruto recibido por tarima
(`reception_pallet_weights` o campo JSON simple — decidir en implementación);
la diferencia contra `pallets.gross_weight_kg` (Fase 21) alimenta incidencias
`WEIGHT_DIFF`.

## Flujos

1. **Hitos** — en el detalle del envío (`SHIPPED`), `national_admin` registra
   hitos con fecha/hora y nota ("cargado al vuelo X"). Coordinators del centro
   emisor los ven en el timeline.
2. **Llegada** — `national_admin` marca `DELIVERED`.
3. **Recepción** — checklist con todas las cajas del envío **pre-llenadas como
   `RECEIVED`**: solo se marcan las excepciones (la merma es la minoría; el
   formulario optimiza para el caso normal). Peso recibido por tarima opcional.
   Al confirmar → `RECONCILED`.
4. **Incidencias automáticas** — cada línea con outcome ≠ `RECEIVED` crea su
   incidencia ligada (tipo según outcome). Diferencia de peso sobre umbral
   (configurable, default 5%) crea `WEIGHT_DIFF`. Las incidencias también se
   crean a mano (envío, tarima o caja) y se resuelven con nota.
5. **Visibilidad** — la ficha pública de caja/tarima muestra "Entregada en
   destino" cuando el envío llega a `DELIVERED`/`RECONCILED` (dato del envío,
   no mutación de la caja). El donante de la Fase 18 podrá recibir "tu donación
   llegó" (gancho existente, no parte de esta fase).
6. **Reportes** — métrica de merma: % de cajas no recibidas por envío y por
   campaña. Se suma a las métricas de éxito del `CLAUDE.md` (el "% REJECTED en
   intake" ya existe; este es su espejo del lado del destino).

## Permisos

| Acción | Quién |
|---|---|
| Registrar hitos, llegada, recepción, resolver incidencias | `national_admin` |
| Ver timeline, recepción e incidencias de sus envíos | `coordinator` del centro emisor |
| Crear incidencia manual sobre sus envíos | `coordinator` + `national_admin` |

Scoping: recepciones e incidencias heredan el centro del envío
(`TenantRepository.scoped()` vía `shipment.center_id`).

## Qué NO entra (YAGNI)

- Cuentas o enlaces para el consignatario en destino (evolución anotada).
- GPS/telemetría o integración con aerolíneas: los hitos se capturan a mano.
- Fotos en recepción/incidencias (reusaría el patrón R2 de la Fase 18; se añade
  si la operación lo pide).
- Reapertura de envíos `RECONCILED` (corrección: incidencia manual + nota).

## Testing

- Máquina extendida: `SHIPPED → DELIVERED → RECONCILED` con eventos; hitos no
  cambian estado; transiciones inválidas rechazadas.
- El invariante de congelamiento: la recepción NO muta cajas ni tarimas.
- Auto-incidencias por línea ≠ RECEIVED y por diferencia de peso sobre umbral.
- Aislamiento tenant de recepciones e incidencias (suite `tests/tenant/`).
- Merma en reportes cuadra con las líneas de recepción.
- Ficha pública refleja entrega sin exponer nada nuevo.
