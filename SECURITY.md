# Security Policy

## Reporting a vulnerability

If you find a vulnerability, report it privately:

- **GitHub**: use [private vulnerability reporting](../../security/advisories/new)
  (*Security* tab → *Report a vulnerability*). This is the preferred channel.
- **Email**: security@araguaney.lat, subject `[SECURITY] araguaney`.

Please do not open a public issue. Include a description, reproduction steps and
your estimate of the impact.

Target response: acknowledgement within 72 hours. This is a single-maintainer
project, so fixes are prioritised by impact on a best-effort basis.

## Scope

Of particular interest:

- Data leaking between centres (multi-tenant isolation by `center_id`).
- Authentication or role bypass (`volunteer` / `coordinator` / `national_admin` /
  `superadmin`).
- Injection (SQL, XSS, SSRF) in public or authenticated endpoints.
- Information disclosure in the public QR fichas.

Out of scope: attacks requiring physical access to the server, social
engineering, and automated-tool findings with no proof of exploitability.

## Test accounts in production

Testing against the production database is sometimes necessary. Creating an
account there with a known password never is.

1. **The system generates the password, not a person.** User creation already
   does this: a random key (`secrets.token_urlsafe`), `must_change_password =
   true`, and delivery by email. That flow is the only supported way to create
   accounts in production.
2. **`must_change_password` is not switched off.** It is the control that
   guarantees the password sent by email stops working the moment it is used.
   That it gets in the way of a test is not a reason to disable it.
3. **A production password is never written down** — not in a chat, a ticket, a
   commit, a log or a script's output. If a procedure requires displaying one,
   the procedure is wrong.
4. **Test account, real mailbox.** If the address receives no mail, do not
   invent a workaround: use one that does (a `+tag` address, for instance), so
   invitation and reset behave exactly as they would for any account.
5. **Test accounts are withdrawn when finished.** Deactivate (`is_active =
   false`) or delete. A forgotten QA account holding `coordinator` or
   `national_admin` is an open door with the most guessable password in the
   system.
6. **Tooling that writes to production is not committed.** It lives in
   `scripts/`, deliberately gitignored. This repository is public: a published
   operations script documents emails, account names and internal procedures
   that add nothing for someone reading the code.

## Existing layers

The implemented security layers are documented in
[`docs/security.md`](docs/security.md). Cross-centre isolation tests live in
[`backend/tests/tenant/`](backend/tests/tenant/) and run in CI on every pull
request.

## Reportar en español

Puedes reportar una vulnerabilidad en español por los mismos canales: el
[reporte privado de GitHub](../../security/advisories/new) o
security@araguaney.lat. Este documento se mantiene en inglés porque se dirige a
quien evalúa o audita el proyecto desde fuera, pero el idioma del reporte no
importa: se atiende igual.
