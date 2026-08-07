# Agent instructions — Araguaney

**The source of truth is [`CLAUDE.md`](CLAUDE.md).** Read it before writing any
code. This file exists because several tools look for `AGENTS.md` by convention,
and it deliberately stays short: two instruction files that repeat each other
drift, and this one had drifted far enough to still call the project a
boilerplate long after it stopped being one.

## What this project is

Araguaney coordinates humanitarian collection centres. In-kind donations are
recorded item by item, packed into **homogeneous boxes** with a QR code,
consolidated into **pallets** and **shipments** with an exportable manifest, and
tracked through to what actually arrived at the destination. Every centre's stock
aggregates into a national dashboard.

Backend: FastAPI + SQLAlchemy 2 + Alembic on Railway. Frontend: Next.js with
NextAuth v5 on Vercel. Postgres, Redis, ARQ for background work.

## The rules that matter most

**Never push to `main`.** Branch, commit, and wait for the maintainer to ask for
the push and the pull request. Both are explicit, separate steps. Full detail in
RULE #1 of `CLAUDE.md`.

**This repository is public.** Review the diff before pushing, with an
adversarial reader in mind: no credentials, no operational emails, and no
parameter values of security or anti-fraud controls — publish the mechanism, keep
the threshold in an environment variable. RULE #2.

**Identifiers in English, product prose in Spanish.** Names of functions,
variables, columns and routes are English. Comments, docstrings, user-facing
errors and alert copy are Spanish. Contributor-facing prose — commit messages,
pull request text, this documentation — is English. Section 10.

**Every data access goes through tenant scoping.** One centre must never see
another's data. `TenantRepository.scoped()` is the guard, and
`backend/tests/tenant/` tests it from the attacker's position.

**No public endpoint invokes AI.** `ensure_available` demands a `user_id`, so an
anonymous route cannot reach it even by accident, and a test walks the real
public routes to keep it that way.

**Background work that holds a promise alerts when it fails**, and declares a
heartbeat window. A cron that never runs does not fail, and therefore never
alerts — that absence is what the heartbeat catches.

## Before claiming something works

Run it. `python -m pytest -q` on **Python 3.12**, which is the version CI uses; a
suite that passes on another version is a statement about your machine. For the
frontend, `npx tsc --noEmit` and `npm run build`. For a migration, run `upgrade`,
`downgrade` and `upgrade` again against a real Postgres — a downgrade that has
never run is a downgrade that does not work.

## Where to look

| For | Read |
|---|---|
| Domain rules, conventions, state machines | [`CLAUDE.md`](CLAUDE.md) |
| What is built and what is pending | [`docs/roadmap/`](docs/roadmap/) |
| Security layers | [`docs/security.md`](docs/security.md) |
| What alerts, and what does not | [`docs/observability.md`](docs/observability.md) |
| End-to-end flow, operational and QA | [`docs/flujo/`](docs/flujo/) |
| Contributing | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
