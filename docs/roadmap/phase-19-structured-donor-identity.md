# Fase 19 — Identidad estructurada del donante en el intake

> Las donaciones siguen siendo anónimas por default, pero un check "Registrar
> donante" en el intake despliega un formulario estructurado: persona física
> (nombre y apellido; email y teléfono opcionales) o persona moral (razón social,
> representante, email, teléfono). Reemplaza al texto libre `donante_libre`. Información de control
> interno del centro: nunca aparece en superficies públicas.
>
> **Spec:** `docs/superpowers/specs/2026-07-29-structured-donor-identity-design.md`
> **Relación con Fase 18:** comparten la tabla `donors` (esquema unificado en el
> spec de la 18). La primera fase que arranque crea la tabla completa; si esta
> arranca antes, la task 1 de la 18 se reduce a las tablas de donaciones.
> **Legal:** amplía la PII de donantes (teléfono, persona moral); task 8.

---

## Objetivos

1. Registrar donantes de forma estructurada, buscable y reutilizable, sin
   perder el anonimato como default.
2. Distinguir persona física de persona moral con los campos correctos.
3. Mantener la cartera de donantes aislada por centro (PII sensible).
4. Retirar `donante_libre` de la captura sin perder los datos históricos.

## No-objetivos (MVP)

- Gestor/CRM de donantes (listado, edición, historial): el registro nace y se
  consulta desde el intake.
- Recibos deducibles / CFDI (gated por el bloque de donativos de Fase 13).
- Verificación del email capturado por el centro.
- Fusión de duplicados entre centros.

---

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Migración: `donors` unificada + `intakes.donor_id` | Crea (o extiende, si la Fase 18 llegó primero) la tabla `donors` con el esquema unificado: `donor_type` (fisica\|moral), `source` (self\|center), `center_id` nullable, `first_name`/`last_name`, `legal_name`, `email`, `phone`. Índices únicos parciales (`WHERE email IS NOT NULL`): email global para `source='self'`, `(email, center_id)` para `source='center'`; email nullable (opcional en física capturada). Añade `intakes.donor_id` FK nullable. `donante_libre` queda de solo lectura. Reversible. | 🔴 Alta | ✅ Done |
| 2 | `DonorRepository` (lado centro) | `find_or_create` por `(email, center_id)` con actualización de campos; sin email crea registro nuevo sin dedupe. Búsqueda para autocompletado (email / nombre / razón social) **scoped por centro**. | 🟠 Media | ✅ Done |
| 3 | Validaciones por tipo | Schema Pydantic discriminado: física (nombre y apellido obligatorios; email y teléfono opcionales) / moral (razón social, representante, email y teléfono obligatorios). Sanitización con `app.utils.sanitize`; teléfono con normalización laxa. | 🟠 Media | ✅ Done |
| 4 | `IntakeService` acepta bloque donante | Campo opcional `donor` en `IntakeCreate` → `find_or_create` + liga `intakes.donor_id`. Deja de escribir `donante_libre`. Intake anónimo intacto. | 🟠 Media | ✅ Done |
| 5 | `GET /v1/donors/search` | Autocompletado autenticado (`require_center_role`), rate-limited, scoped: solo donantes del centro del solicitante; `national_admin` puede filtrar por centro. | 🟠 Media | ✅ Done |
| 6 | Intake UI: check + formulario | Check "Registrar donante" (default apagado = anónima) → toggle física/moral con sus campos y autocompletado por email. Donde exista `donante_libre` histórico, se muestra como dato legado de solo lectura. i18n ES/EN. | 🔴 Alta | ✅ Done |
| 7 | Detalle de intake muestra donante | Visible solo para usuarios del centro y `national_admin`. Auditoría de acceso no requerida en MVP; ninguna superficie pública lo incluye. | 🟢 Baja | ✅ Done |
| 8 | Legal | Aviso de privacidad (persona moral, teléfono), tabla de retención, ARCO. | 🟠 Media | ⬜ |
| 9 | Tests | Validación por tipo, dedupe intra-centro / no-dedupe inter-centro, aislamiento tenant del buscador y del detalle (por búsqueda y por ID), fichas públicas sin rastro del donante, regresión del intake anónimo. | 🔴 Alta | ✅ Done |

---

## Orden sugerido

1 → 2 → 3 → 4 → 5 (backend completo) → 6 → 7 (frontend) → 8 → 9 (cierre).

## Definition of Done de la fase

- Un intake anónimo se captura exactamente igual que hoy.
- Con el check activo, física (solo nombre obligatorio) y moral se registran con sus campos y validaciones.
- El mismo email en el mismo centro reutiliza el registro; en otro centro crea uno nuevo; sin email siempre crea registro nuevo.
- Un usuario de un centro no puede ver ni enumerar donantes de otro (test en `tests/tenant/`).
- Ninguna ficha pública ni schema público expone datos del donante.
- `donante_libre` ya no se escribe; el histórico sigue visible.
- Aviso de privacidad y retención actualizados.
