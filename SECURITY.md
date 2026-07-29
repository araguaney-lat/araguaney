# Política de seguridad / Security Policy

## Reportar una vulnerabilidad · Reporting a vulnerability

**ES** — Si encuentras una vulnerabilidad, repórtala de forma privada:

- **GitHub**: usa [Private vulnerability reporting](../../security/advisories/new)
  (pestaña *Security* → *Report a vulnerability*). Es el canal preferido.
- **Email**: security@araguaney.lat con el asunto `[SECURITY] araguaney`.

No abras un issue público para vulnerabilidades. Araguaney gestiona inventario
de ayuda humanitaria de centros reales: una fuga entre centros o un bypass de
autenticación afecta operaciones en curso.

Qué incluir: descripción, pasos para reproducir, impacto estimado y, si la
tienes, una sugerencia de arreglo. Respuesta objetivo: acuse en 72 horas.
Proyecto de mantenedor único — los arreglos se priorizan por impacto, con
mejor esfuerzo.

**EN** — If you find a vulnerability, report it privately via
[GitHub private vulnerability reporting](../../security/advisories/new)
(preferred) or by email to security@araguaney.lat with subject
`[SECURITY] araguaney`. Please do not open a public issue. Include a
description, reproduction steps and estimated impact. Target response:
acknowledgement within 72 hours. Single-maintainer project — fixes are
prioritized by impact, best effort.

## Alcance · Scope

Especial interés en / of special interest:

- Fuga de datos entre centros (aislamiento multi-tenant por `center_id`).
- Bypass de autenticación o de roles (`volunteer` / `coordinator` /
  `national_admin` / `superadmin`).
- Inyección (SQL, XSS, SSRF) en endpoints públicos o autenticados.
- Exposición de información en las fichas públicas de QR.

Fuera de alcance / out of scope: ataques que requieran acceso físico al
servidor, ingeniería social, y hallazgos de herramientas automáticas sin
prueba de explotabilidad.

## Cuentas de prueba en producción · Test accounts in production

**ES** — Probar contra la base de producción es a veces necesario, crear ahí una
cuenta con contraseña conocida no lo es nunca. Las reglas:

1. **La contraseña la genera el sistema, no una persona.** El alta de usuarios
   ya lo hace: clave aleatoria (`secrets.token_urlsafe`), `must_change_password
   = true` y envío por email. Ese flujo es el único camino soportado para crear
   cuentas en producción.
2. **No se desactiva `must_change_password`.** Es el control que garantiza que
   la clave que viajó por email deja de servir en cuanto se usa. Que estorbe a
   una prueba no es razón para apagarlo.
3. **Una contraseña de producción no se escribe nunca** en un chat, un ticket,
   un commit, un log ni la salida de un script. Si un procedimiento necesita
   mostrarla, el procedimiento está mal.
4. **Cuenta de prueba, buzón real.** Si el email no recibe correo, no se
   inventa un rodeo: se usa una dirección que sí reciba (por ejemplo con
   `+tag`), para que la invitación y el reseteo funcionen como en cualquier
   cuenta.
5. **Las cuentas de prueba se retiran al terminar.** Desactivar (`is_active =
   false`) o borrar. Una cuenta QA olvidada con rol `coordinator` o
   `national_admin` es una puerta abierta con la contraseña más adivinable del
   sistema.
6. **Las utilidades que escriben en producción no se versionan.** Viven en
   `scripts/`, ignorado a propósito en `.gitignore`. Este repo es público: un
   script de operación publicado documenta emails, nombres de cuenta y
   procedimientos internos que no aportan nada a quien lee el código.

**EN** — Testing against production is sometimes necessary; creating an account
there with a known password never is. Passwords must be system-generated,
`must_change_password` must stay on, and a production password must never be
written to a chat, commit, log or script output. Use an address that actually
receives mail, remove test accounts when done, and keep production-writing
tooling in the gitignored `scripts/` directory — this repository is public.

## Capas existentes · Existing layers

Las capas de seguridad implementadas están documentadas en
[`docs/security.md`](docs/security.md). Los tests de aislamiento entre centros
viven en [`backend/tests/tenant/`](backend/tests/tenant/) y corren en CI en
cada PR.
