# Fase 13 — Compliance y legal

> Cumplimiento legal y de privacidad de la plataforma. Se divide en dos bloques:
> **Grupo A — necesario ahora** (la plataforma ya trata datos personales de usuarios: emails,
> IPs, logs de auditoría) y **Grupo B — necesario solo cuando se habiliten donaciones de dinero**
> para sostener la plataforma (no para lucro personal).

> Marco de referencia: **LFPDPPP** (Ley Federal de Protección de Datos Personales en Posesión de
> los Particulares, México) y su Reglamento. El producto NO trata PII de donantes/beneficiarios
> por diseño (CLAUDE.md §2, §9), pero SÍ trata datos personales de los **operadores/usuarios**.

> ⚠️ Este documento no es asesoría legal. El Grupo B (donaciones de dinero) requiere revisión de
> un abogado y contador en México **antes** de escribir código de pagos.

---

## Por qué aplica aunque no haya PII de beneficiarios

La plataforma ya recaba y trata datos personales de sus usuarios operativos:

| Dato | Dónde | Naturaleza legal |
|------|-------|------------------|
| Email, nombre, `username` | `users` | Dato personal |
| Contraseña (hash) | `users` | Dato sensible (protección reforzada) |
| IP del usuario | `audit_log.ip`, logs, rate-limit | **Dato personal** bajo LFPDPPP |
| `user_id` + timestamp + acción | `audit_log`, `*_event` | Dato personal (perfilamiento de actividad) |
| Rol, `center_id`, campañas | `users`, `user_campaigns` | Dato personal (relación laboral/voluntariado) |

La LFPDPPP (arts. 15–16) obliga a poner el **Aviso de Privacidad** a disposición del titular
**desde el momento en que se recaba el dato** — no depende del tamaño del proyecto ni de si hay
fines de lucro. El trazado de IPs de la Fase 10 refuerza la necesidad: se recaba IP → debe
declararse en el aviso.

---

## Grupo A — Necesario AHORA

> Bloqueante para operar de forma limpia. Barato de implementar (páginas estáticas + un checkbox
> + una columna). Alto valor de protección para un proyecto políticamente sensible.

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 1 | Aviso de Privacidad (página pública) | Ruta pública `/aviso-de-privacidad` (ES) + `/privacy` (EN). Contenido mínimo LFPDPPP art. 16: identidad y domicilio del responsable, datos que se recaban (email, nombre, IP, logs de auditoría), finalidades (operación de la plataforma, seguridad, auditoría), transferencias (Vercel/Railway/Cloudflare como encargados), medios para ejercer derechos **ARCO**, mecanismo de revocación del consentimiento, y cómo se notifican cambios al aviso. SSR/estática, cacheable en edge. | 🔴 | ✅ Done — `app/aviso-de-privacidad`, `app/privacy`; renderer data-driven `LegalDoc` + contenido en `src/content/legal/`. Responsable = proyecto Araguaney (entidad por constituir, se completará con B.9). Encargados reales declarados: Vercel, Railway, Cloudflare, Resend, Cloudinary, Google/Sentry opcionales. |
| 2 | Términos y Condiciones (página pública) | Ruta pública `/terminos` (ES) + `/terms` (EN). Debe incluir: naturaleza del servicio (**coordinación de inventario, sin garantía de entrega de ayuda**), **límite de responsabilidad** (crítico), conducta esperada del usuario, propiedad del contenido/datos que suben los centros, reglas de rechazo de donaciones (caducidad, controlados — CLAUDE.md §7), jurisdicción y ley aplicable (México), y proceso de cambios. | 🔴 | ✅ Done — `app/terminos`, `app/terms`. Incluye límite de responsabilidad (callout), sin garantía de entrega, reglas de rechazo (365/180 días, controlados, caja homogénea), propiedad de datos por centro, jurisdicción México. |
| 3 | Aceptación de términos en registro | Checkbox obligatorio "He leído y acepto los [Términos] y el [Aviso de Privacidad]" en el formulario de registro/invitación. Backend: columna `users.accepted_terms_at TIMESTAMP(tz)` + `accepted_terms_version VARCHAR`. Migración Alembic reversible. No permitir crear usuario sin aceptación. Registrar en `audit_log`. | 🔴 | ✅ Done — como los usuarios se crean por invitación (no auto-registro), el gate se implementó en el primer login, igual que `must_change_password`: migración `022_terms_acceptance.py` (`accepted_terms_at`, `accepted_terms_version`, reversible), endpoint `POST /v1/auth/me/accept-terms` (valida versión, `409 TERMS_VERSION_MISMATCH` si desactualizada), página dedicada `/accept-terms` con checkbox obligatorio, gate en `dashboard/layout.tsx` y `studio/layout.tsx` (`must_accept_terms`), y `audit_log` con acción `USER_TERMS_ACCEPTED`. Verificado end-to-end con TestClient: invitado nuevo → cambio de password forzado → aceptar términos → acceso liberado. |
| 4 | Links en footer y layout público | Enlaces a Aviso de Privacidad y Términos en el footer de todas las páginas (público + dashboard). Visibles y accesibles desde cualquier vista. | 🔴 | ✅ Done — `HomeFooter` (todas las páginas públicas, links por idioma), footer de `/contacto`, y enlaces en `/login`. Footer del dashboard queda para task 3. |
| 5 | Declarar tratamiento de IP y auditoría en el aviso | Coordinar con Fase 10 (trazado de IP): el aviso debe declarar explícitamente que se registran IPs y actividad con fines de seguridad y auditoría, y el periodo de retención (alinear con la purga de `audit_log` por cron — Fase 12). | 🔴 | ✅ Done — sección "Tratamiento de IP y registros de auditoría" en el aviso. Retención alineada con la política "no purgar eventos" (Fase 12): se conservan mientras sean necesarios para trazabilidad; se eliminan/anonimizan tras cancelación salvo obligación legal/seguridad. |
| 6 | Política de cookies / sesión | Declarar las cookies estrictamente necesarias (sesión NextAuth, CSRF). Si se agrega analytics (Fase 11 usa Plausible/Umami sin cookies), confirmar que no requiere banner de consentimiento. Documentar la postura "sin cookies de tracking". | 🟡 | ✅ Done — sección "Cookies y tecnologías de sesión": sesión, CSRF, idioma; sin cookies de tracking en el panel; analítica solo en páginas públicas de difusión. |
| 7 | Versionado de documentos legales | Cada documento legal lleva versión + fecha de última actualización visible. Cuando cambie el aviso/términos, incrementar versión; usuarios existentes re-aceptan en próximo login si `accepted_terms_version` quedó atrás. | 🟡 | ✅ Done — cada documento lleva `version` + fecha visible (v1.0, 2026-07-02). `CURRENT_TERMS_VERSION` centralizado en `backend/app/legal.py` y `frontend/src/lib/legal.ts` (mantener sincronizados manualmente con los `version` de `src/content/legal/*` al publicar cambios). Un usuario con `accepted_terms_version` distinto a la versión vigente vuelve a ver `/accept-terms` en su próximo login. |
| 8 | Ejercicio de derechos ARCO | Mecanismo (mínimo: email de contacto dedicado o formulario) para que un usuario solicite Acceso, Rectificación, Cancelación u Oposición sobre sus datos. Documentar SLA de respuesta interno. | 🟡 | ✅ Done — correo dedicado `privacidad@araguaney.lat` + SLA de 20 días hábiles declarado en el aviso. |
| 19 | Borrado autoservicio de datos personales | Hoy la cancelación (la **C** de ARCO) es 100% manual: el titular escribe a `privacidad@araguaney.lat` y el responsable ejecuta el borrado a mano. Falta un flujo en producto. **Diseño propuesto:** botón "Eliminar mi cuenta" en el perfil que (a) pide confirmación con contraseña, (b) **anonimiza** en vez de borrar en cascada, porque el `audit_log` y los `*_event` deben seguir siendo atribuibles: la caja sellada no puede perder su trazabilidad. Reemplazar `email`/`username`/`full_name` por un tombstone (`usuario-eliminado-<hash>`), vaciar `avatar_url`, `totp_secret` y tokens, marcar `is_active = false`, y conservar solo el `user_id` en los eventos históricos. (c) Bloqueo si es el **único coordinator** de un centro activo: primero hay que transferir la responsabilidad. (d) Escribir un evento de auditoría del propio borrado. Exponer también `DELETE /v1/users/me`. Detectado al llenar el indicador 9A de la postulación al DPG, donde es la única respuesta que hoy admite "no existe". | 🟡 | ⬜ |
| 20 | Política de retención documentada | El aviso declara finalidades pero no **plazos de conservación**. Definir y publicar: cuánto se conservan las cuentas inactivas, los registros de auditoría (que sostienen la trazabilidad del inventario y por eso duran más), y los adjuntos de mensajería (hoy ya se purgan solos al vencer, `ThreadService.purge_expired`). La LFPDPPP exige suprimir los datos cuando dejen de ser necesarios para la finalidad que los originó. | 🟢 | ⬜ |

---

## Grupo B — Necesario CUANDO se habiliten donaciones de dinero

> **No implementar hasta decidir habilitar donaciones.** Requiere asesoría legal/fiscal previa.
> El objetivo declarado es **sostener la plataforma, no beneficio personal** — eso debe quedar
> explícito, verificable y separado contablemente.

### B.1 — Estructura jurídica y fiscal (ANTES de escribir código de pagos)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 9 | Definir entidad receptora | Determinar **quién** recibe los fondos legalmente. Recibir donativos "a nombre personal" para la plataforma es problemático fiscal/legalmente aunque no sea para lucro. Evaluar constituir AC / OSC (México) o figura equivalente. **Decisión previa a todo código de pagos.** | 🔴 | ⬜ Pendiente |
| 10 | Asesoría legal + contable (MX) | Contratar revisión de abogado y contador: obligaciones fiscales de recibir donativos, CFDI, régimen de donatarias autorizadas si se busca deducibilidad, reporte de uso de fondos. | 🔴 | ⬜ Pendiente |
| 11 | Separación contable de fondos | Cuenta/registro separado para donativos de sostenimiento. Trazabilidad de que se usan para infraestructura (Vercel/Railway/Cloudflare/dominio), no para beneficio personal. | 🔴 | ⬜ Pendiente |

### B.2 — Legal y privacidad de pagos

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 12 | Ampliar Aviso de Privacidad (pagos) | Agregar tratamiento de datos financieros del donante: nombre, email, monto, quizá RFC para recibo. Declarar al procesador de pago como encargado/transferencia. | 🔴 | ⬜ Pendiente |
| 13 | Términos de donación | Documento/sección separada: naturaleza voluntaria y **no reembolsable** del donativo, destino (sostenimiento de la plataforma), que NO otorga contraprestación ni participación, transparencia del uso. | 🔴 | ⬜ Pendiente |
| 14 | Reflejar T&C del procesador | Stripe/PayPal/Mercado Pago imponen sus propios términos y políticas de datos. Reflejarlos/enlazarlos donde corresponda. | 🟡 | ⬜ Pendiente |
| 15 | Página de transparencia de fondos | Página pública que reporte ingresos por donativos y su uso (costos de infraestructura). Refuerza el "no para beneficio personal" y genera confianza. Alinear con proyecto sensible. | 🟡 | ⬜ Pendiente |

### B.3 — Seguridad técnica de pagos

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 16 | Usar procesador hosted (NO tocar tarjeta) | Integrar con **Stripe Checkout / hosted fields** (o equivalente) para que los datos de tarjeta nunca pasen por el backend → minimiza alcance PCI-DSS (SAQ-A). El boilerplate ya trae capa Stripe opcional (CLAUDE.md §14). | 🔴 | ⬜ Pendiente |
| 17 | Webhooks firmados + idempotencia | Verificar firma de webhooks del procesador, manejar idempotencia, no confiar en el cliente para confirmar el pago. Rate-limit + auth en endpoints de pago. | 🔴 | ⬜ Pendiente |
| 18 | Turnstile en formulario de donación | Formulario público de escritura → Turnstile (CLAUDE.md §9) para anti-abuso/fraude. Edge cache solo en lectura, nunca en el POST. | 🟡 | ⬜ Pendiente |

---

## Dependencias y notas

- **Grupo A es independiente** y puede/debe hacerse ya. Encaja con Fase 11 (páginas públicas /
  SEO) para reutilizar layout público, footer y metadata.
- **Task 5** coordina con Fase 10 (trazado de IP) y Fase 12 (retención/purga de `audit_log`).
- **Task 3** toca `users` → migración Alembic + ajuste al flujo de registro/invitación (CLAUDE.md §6).
- **Grupo B completo depende del Grupo A** (el aviso y términos se amplían, no se reescriben) y de
  una **decisión de negocio + asesoría profesional** que precede a cualquier implementación.
- La capa Stripe del boilerplate está desactivada por default (CLAUDE.md §14, `docs/optional-layers.md`).
- Mantener la postura del producto: **sin PII de beneficiarios** (CLAUDE.md §2). Las donaciones de
  dinero introducen PII del **donante**, que es una superficie nueva a declarar y proteger.

---

## Definition of Done

### Grupo A (ahora)
- Aviso de Privacidad y Términos publicados, versionados y enlazados en footer.
- Registro exige aceptación; `accepted_terms_at` / `accepted_terms_version` persistidos y auditados.
- El aviso declara el tratamiento de IP/auditoría y su retención.
- Mecanismo ARCO documentado y operativo (mínimo email dedicado).

### Grupo B (al habilitar donaciones)
- Entidad receptora definida y asesoría legal/fiscal completada **antes** de implementar pagos.
- Datos de tarjeta nunca tocan el backend (procesador hosted, alcance PCI-DSS mínimo).
- Aviso de Privacidad y Términos de donación amplían el marco existente.
- Página de transparencia de uso de fondos publicada.
- Separación contable verificable de los donativos de sostenimiento.
