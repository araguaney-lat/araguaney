# Borrado autoservicio de cuenta (Fase 13, task 19)

**Fecha:** 2026-07-27
**Estado:** aprobado
**Origen:** indicador 9A de la postulación al DPG Registry. Es la única respuesta
del cuestionario que hoy admite un "no existe": la cancelación (la **C** de los
derechos ARCO) se atiende de forma 100% manual por correo.

---

## 1. Problema

La LFPDPPP reconoce el derecho de cancelación a toda persona titular. Hoy se
ejerce escribiendo a `privacidad@araguaney.lat` y el responsable ejecuta el
borrado a mano. Funciona, pero no escala, depende de una persona, y no es
verificable por quien lo solicita.

## 2. La restricción que define el diseño

**No se puede borrar en cascada.** El `audit_log` y los `*_event` registran quién
selló cada caja, cerró cada tarima y despachó cada envío. Esa atribución es lo
que hace que un manifiesto sea válido ante aduana. Borrar el usuario en cascada
destruiría la trazabilidad de inventario que ya salió del país.

Por eso el borrado **anonimiza**: el registro sobrevive como identificador
opaco, y todo dato personal se destruye.

## 3. Decisiones tomadas

| Decisión | Elección | Por qué |
|---|---|---|
| Ejecución | Inmediata, confirmando con contraseña | La LFPDPPP espera atención sin dilación. Un periodo de gracia exigiría job programado, estado nuevo y explicarlo en el aviso, para proteger de un caso poco frecuente |
| Contenido escrito | Se conserva, autoría anonimizada | Los hilos le sirven a las otras personas participantes y las notas son contexto operativo. Borrarlos dejaría conversaciones truncadas para terceros |
| Alcance | Todos los roles, con salvaguardas de continuidad | El derecho es universal; solo se frena donde el sistema quedaría sin quién opere |

## 4. Anonimización

Sobre el registro de `users`:

| Campo | Queda en | Nota |
|---|---|---|
| `id` | **intacto** | Ancla de trazabilidad en `audit_log` y `*_event` |
| `email` | `eliminado-<uuid8>@araguaney.invalid` | `unique=True`, de ahí el sufijo. `.invalid` está reservado por RFC 2606, así que nunca es entregable |
| `username` | `usuario-eliminado-<uuid8>` | `unique=True` |
| `full_name`, `avatar_url`, `country_code` | `NULL` | |
| `hashed_password` | `NULL` | Impide autenticarse |
| `verification_token`, `reset_password_token`, `reset_password_token_expires_at` | `NULL` | |
| `totp_secret` | `NULL`, `totp_enabled = false` | |
| `registered_provider` | `NULL` | Evita re-entrar por OAuth |
| `center_id`, `center_role` | `NULL` | La relación con un centro también es dato personal |
| `is_active` | `false` | Invalida toda sesión existente |

Efectos colaterales:

- **Avatar en Cloudinary**: se destruye. El `public_id` es el propio `user.id`
  (ver `ProfileService.upload_avatar`), así que es un `destroy` directo. Si
  Cloudinary no está configurado o falla, se registra el error y el borrado
  continúa: el dato local ya no apunta a la imagen.
- **Membresías de campaña** (`user_campaigns`): se eliminan. No aportan
  trazabilidad y son relación personal.
- **Mensajería**: intacta. `ThreadParticipant` conserva el `user_id` y la
  interfaz mostrará el tombstone.

## 5. Salvaguardas de continuidad

Se evalúan **antes** de modificar nada. Si alguna aplica, no se toca el registro
y se responde `409` con el detalle de qué transferir primero.

| Bloqueo | Condición |
|---|---|
| Única coordinación de un centro | La persona es `coordinator`, su centro está activo, y no hay otro usuario activo con `center_role = coordinator` en ese centro |
| Última administración nacional | Es `national_admin` y no hay otra activa |
| Última superadministración | Es `superadmin` (`users.role`) y no hay otra activa |

El mensaje nombra la acción requerida, no solo el impedimento. Ejemplo:
*"Eres la única coordinación activa de este centro. Asigna otra coordinación
antes de eliminar tu cuenta."*

## 6. API

```
DELETE /v1/users/me
body: { "password": "..." }
```

- Requiere sesión válida (`get_current_user`).
- `401` si la contraseña no coincide. **No modifica nada.**
- `409` si aplica una salvaguarda.
- `204` en éxito.
- Rate limit `5/minute`, como el resto de endpoints sensibles de cuenta.

Efectos en la misma transacción: anonimización, borrado de membresías, evento
de auditoría `USER_SELF_DELETED` (entidad `user`, con `user_id` e IP vía
`get_client_ip`), y alta del `jti` actual en la lista de revocación.

**Las demás sesiones no necesitan revocación explícita**: `get_current_user` ya
responde `403 ACCOUNT_DISABLED` cuando `is_active` es falso.

## 7. Interfaz

Zona de peligro al final de `/dashboard/settings`, visualmente separada
(borde rojo, no el estilo de las otras tarjetas):

```
Eliminar mi cuenta
Tu nombre, correo y foto se eliminan de forma permanente. El registro de
qué cajas sellaste o qué envíos despachaste se conserva sin tu nombre,
porque la trazabilidad del inventario no puede romperse.
Esta acción no se puede deshacer.

[ contraseña ]  [ Eliminar mi cuenta ]
```

Al confirmar: `signOut()` y redirección al login con un aviso de cuenta
eliminada. Copy en ES y EN.

## 8. Tests

En `backend/tests/test_account_deletion.py`:

1. Anonimiza todos los campos personales y conserva el `id`.
2. Tombstones únicos: dos borrados no colisionan en `email` ni `username`.
3. Contraseña incorrecta responde `401` y **no** modifica el registro.
4. Bloqueo por única coordinación (`409`), y permitido cuando hay otra activa.
5. Bloqueo por última `national_admin`.
6. Bloqueo por última `superadmin`.
7. Escribe el evento de auditoría.
8. Elimina las membresías de campaña.
9. La sesión queda inválida (`is_active` en falso).

## 9. Fuera de alcance

- Periodo de gracia o restauración.
- Borrado de mensajes o notas escritos por la persona.
- Cambios al borrado que hoy ejecuta un administrador.
- Política de plazos de conservación: es la task 20.

## 10. Definition of Done

- [ ] `DELETE /v1/users/me` con los tres códigos de respuesta.
- [ ] Anonimización completa, `id` preservado, avatar destruido en Cloudinary.
- [ ] Las tres salvaguardas, con mensaje accionable.
- [ ] Evento de auditoría del propio borrado.
- [ ] Zona de peligro en `/dashboard/settings`, ES y EN.
- [ ] Tests en verde, incluida la suite existente.
- [ ] Aviso de privacidad: la sección de derechos ARCO menciona el flujo en producto.
- [ ] Roadmap: task 19 marcada.
