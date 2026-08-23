# Contributing to Araguaney

Thanks for your interest. The honest context first:

**Araguaney has a single maintainer** with a full-time job elsewhere. Issues and
pull requests are reviewed on a best-effort basis, prioritising anything that
affects collection centres currently operating. A small, focused pull request
with tests is far more likely to be merged quickly than a large one.

## What helps most

1. **Reports from real operators.** If you use Araguaney in a collection centre
   and something gets in the way of the flow (intake → box → pallet → shipment),
   an issue with concrete steps is worth its weight in gold.
2. **Bug fixes with a regression test.**
3. **Translations.** The site is ES/EN; copy lives in
   `frontend/src/dictionaries/` and in each page's `CONTENT`.

## What probably will not be merged

- Large features without prior discussion in an issue.
- Changes that introduce personal data about donors or beneficiaries. This is a
  product line, not a technical one: **no PII is recorded**.
- Heavy new dependencies without justification.

## Development setup

### Backend (FastAPI, Python 3.12)

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx
python -m pytest -q          # 880+ tests, no external services
```

The whole suite — including the multi-tenant isolation tests in `tests/tenant/`
— runs on in-memory SQLite. You need neither Postgres nor Redis to develop. To
run the server you do: copy `.env.example` to `.env` and start a local Postgres.

Python 3.12 is not arbitrary: it is the version CI uses. A suite that passes on
another version is a statement about your machine, not about CI.

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev                  # locale routes: /es, /en
npx tsc --noEmit             # types
npm run build                # what Vercel will run
```

## Conventions

The full set lives in [`CLAUDE.md`](CLAUDE.md). The ones that most often trip up
a first contribution:

**Identifiers in English, product prose in Spanish.** Function, variable and
column names are English. Comments, docstrings, user-facing error text and alert
copy are Spanish: the project operates in Spanish and an alert gets read by
whoever is on call at three in the morning.

**Contributor-facing prose is English.** Commit messages and pull request text.
They are read from outside the project and stay indexed.

**Pull requests are written in English and Spanish**, in a formal register, with
the same content in both blocks. See RULE #3 in `CLAUDE.md`.

**Every data access goes through tenant scoping.** One centre must never see
another's inventory. There is a dedicated suite for this in `tests/tenant/`,
written from the attacker's position, and a new endpoint that reads data belongs
in it.

**No AI call leaves a public endpoint.** `ensure_available` demands a `user_id`,
so an anonymous route cannot reach it even by accident. A test walks the real
public routes and fails if one does.

## Pull request checklist

- Tests for the business rule you touched.
- `python -m pytest -q` green on Python 3.12.
- `npx tsc --noEmit` and `npm run build` green if you touched the frontend.
- A reversible Alembic migration (`upgrade` and `downgrade`) if you touched the
  schema. Run it up, down and up again — a downgrade that has never run is a
  downgrade that does not work.
- Roadmap updated in `docs/roadmap/` if the change completes a task.

## Security

Do not open a public issue for a vulnerability. See [`SECURITY.md`](SECURITY.md).

## Code of conduct

Participating means agreeing to the [Code of Conduct](CODE_OF_CONDUCT.md).
