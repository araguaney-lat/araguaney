# Identidad estructurada del donante en el intake — Diseño

**Fecha:** 2026-07-29
**Fase:** 19 (`docs/roadmap/phase-19-structured-donor-identity.md`)
**Estado:** aprobado en sesión de diseño
**Relación:** comparte la tabla `donors` con la Fase 18
(`2026-07-29-donor-preregistration-design.md`); la primera fase que arranque
crea la tabla completa y la otra solo la usa.

---

## Problema

Las donaciones deben poder ser anónimas, pero cuando el donante quiere quedar
registrado (recibos, seguimiento, relación institucional) hoy solo existe
`intakes.donante_libre`: una línea de texto sin estructura, imposible de
buscar, deduplicar o reutilizar. Además no distingue entre una persona y una
empresa, y la información del donante es de control interno del centro: no
debe salir en ninguna superficie pública.

## Decisiones tomadas

| Decisión | Elección | Por qué |
|---|---|---|
| Registro único | La misma tabla `donors` de la Fase 18, con `source` (self\|center) y `donor_type` (fisica\|moral) | Ninguna fase está implementada: unificar hoy es gratis, fusionar después sería una migración dolorosa. Quien pre-registra y luego dona en ventanilla es una sola persona |
| Visibilidad | Solo el centro que capturó + `national_admin` | La cartera de donantes es la PII más sensible del sistema; el aislamiento entre tenants aplica igual que al inventario |
| Anonimato | Default anónimo; check "Registrar donante" despliega el formulario | El anonimato es la norma del dominio (NO-objetivo #4 original); registrar es la excepción explícita |
| Unicidad de email | Único global entre `source=self`; único por `(email, center_id)` entre `source=center` | Un único global filtaría entre centros la existencia de un donante ("este email ya está registrado" = canal lateral). El mismo donante en dos centros son dos registros: aceptable |
| `donante_libre` | Se deja de escribir; se muestra como dato legado donde exista | Sin migración de datos inventada: el texto libre viejo no se puede convertir en campos estructurados con fiabilidad |

## Campos por tipo

| | Persona física | Persona moral |
|---|---|---|
| `first_name`, `last_name` | La persona (obligatorios) | El representante que lleva la donación (obligatorios) |
| `legal_name` | — | Razón social (obligatoria) |
| `email` | Opcional | Obligatorio |
| `phone` | Opcional | Obligatorio |

Lo único obligatorio en física es el nombre: quien dona en ventanilla y quiere
quedar registrado no siempre tiene o quiere dar email. El costo, asumido: **sin
email no hay deduplicación ni autocompletado** (el email es la llave de reuso),
así que un físico sin email es una entrada suelta cada vez. El índice único de
`(email, center_id)` pasa a parcial (`WHERE email IS NOT NULL`).

Validaciones con los helpers existentes (`app.utils.sanitize`, validación de
email de Pydantic); teléfono con normalización laxa (dígitos, `+`, espacios),
sin pretender validación E.164 estricta en MVP.

## Cambios de modelo

- `donors`: esquema unificado (ver spec de Fase 18). Esta fase usa
  `source='center'`, `center_id` = centro del capturador, sin tokens ni
  verificación de email (la verificación es exclusiva del autoservicio).
- `intakes.donor_id` FK nullable → `donors.id`. Null = donación anónima.
- `intakes.donante_libre` queda como columna legada de solo lectura.

## Flujo en el intake

1. El formulario de intake gana el check **"Registrar donante"** (apagado por
   default = anónimo, como hoy).
2. Al activarlo: toggle **física / moral** con los campos de la tabla de arriba.
3. **Autocompletado por email** sobre los donantes del propio centro
   (`GET /v1/donors/search?q=`, scoped): si ya existe, se reutiliza el registro
   y no se re-teclea nada. La coincidencia es solo dentro del centro.
4. Al enviar el intake: con email, `find_or_create` por `(email, center_id)` —
   si existe se actualizan los campos editados, si no se crea con
   `source='center'`. Sin email (solo física): se crea siempre un registro
   nuevo, sin intento de dedupe.
5. El detalle del intake muestra el donante a usuarios del centro y
   `national_admin`. Ninguna ficha pública (QR de caja/tarima, panel "qué
   falta") lo incluye, y ningún schema público lo expone.

Con la Fase 18 desplegada: al recibir una donación pre-registrada, el intake
hereda `donor_id` del pre-registro (source=self); el check no aplica porque el
donante ya viene identificado.

## Seguridad y privacidad

- Endpoints nuevos solo autenticados (`require_center_role`), rate-limited, y
  todo acceso scoped por `TenantRepository.scoped()` sobre `center_id`.
- El buscador responde únicamente donantes del centro del solicitante:
  probar explícitamente que un coordinator de A no puede enumerar donantes de B
  ni por búsqueda ni por ID directo.
- PII nueva (teléfono, razón social, representante): actualizar aviso de
  privacidad (categoría donante: se amplía a persona moral), tabla de
  retención y derechos ARCO (manual por email, como el resto).
- Sin cifrado de columna en MVP (consistente con `users.email`); si se decide
  cifrar, `app.utils.crypto` ya existe — anotado como decisión explícita.

## No entra (YAGNI)

- Gestor/CRM de donantes (listado, edición, historial por donante): el registro
  nace del intake y se consulta desde el intake. Si algún día hace falta, la
  tabla ya lo soporta.
- Recibos deducibles / CFDI (depende del bloque de donativos de Fase 13, gated).
- Verificación del email capturado por el centro (solo el autoservicio verifica).
- Fusión de donantes duplicados entre centros.

## Testing

- Validación por tipo (física sin teléfono, moral con razón social obligatoria).
- `find_or_create`: dedupe dentro del centro, no-dedupe entre centros.
- Aislamiento tenant del buscador y del detalle (suite `tests/tenant/`).
- Fichas públicas y schemas públicos sin rastro del donante.
- Intake anónimo sigue funcionando idéntico (regresión).
