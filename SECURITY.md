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

## Capas existentes · Existing layers

Las capas de seguridad implementadas están documentadas en
[`docs/security.md`](docs/security.md). Los tests de aislamiento entre centros
viven en [`backend/tests/tenant/`](backend/tests/tenant/) y corren en CI en
cada PR.
