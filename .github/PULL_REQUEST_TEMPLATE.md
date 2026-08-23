<!--
Pull requests are written in English and Spanish, in a formal register, with the
same content in both blocks — not a trimmed summary in one of them. RULE #3 in
CLAUDE.md explains why: this repository is public, the pull request is indexed
and outlives the branch, and it is read before the code.

This repository is public and a push cannot be undone. Before opening the pull
request, read `git diff main..HEAD` as an outside — and adversarial — reader
would, and confirm none of the following is in it: credentials, tokens,
infrastructure hosts or database URLs; operational email addresses; the
parameters of a security or anti-fraud control (thresholds, limits, windows —
publish the mechanism, never the value that decides when it fires); text
explaining how to evade a control; or files swept in by an unexamined `git add`.
RULE #2 covers this in full.
-->

## English

### What problem this solves

<!-- Enough context to understand it without opening the code. -->

### How it solves it

<!-- And why this way rather than the alternative, when there was one. -->

### What does not change

<!-- Public boundaries, contracts, migrations. In a refactor this is what the
reviewer cares about most. -->

### How it was verified

<!-- Concrete evidence: the commands and their output. -->

### Test plan

<!-- Only when the change is exercised through the interface. Delete otherwise. -->

## Español

### Qué problema resuelve

<!-- Con el contexto suficiente para entenderlo sin abrir el código. -->

### Cómo lo resuelve

<!-- Y por qué así y no de otra forma, cuando hubo alternativa. -->

### Qué no cambia

<!-- Límites públicos, contratos, migraciones. En un refactor es lo que más le
importa a quien revisa. -->

### Cómo se verificó

<!-- Evidencia concreta: los comandos y su salida. -->

### Plan de prueba

<!-- Solo cuando el cambio se toca desde la interfaz. Si no, borra esta sección. -->

---

## Checklist

- [ ] Tests cover the business rule this touches.
- [ ] `python -m pytest -q` green on Python 3.12.
- [ ] `npx tsc --noEmit` and `npm run build` green, if the frontend was touched.
- [ ] Every data access goes through tenant scoping; a new endpoint that reads
      data has a case in `tests/tenant/`.
- [ ] A state change writes its `*_event` row.
- [ ] The Alembic migration is reversible — run it up, down and up again.
- [ ] New background work alerts on failure and declares its heartbeat window.
- [ ] No beneficiary PII introduced; donor data only through the routes already
      provided for it.
- [ ] `docs/roadmap/` updated if this completes a task, including the totals in
      `docs/roadmap/README.md`.
