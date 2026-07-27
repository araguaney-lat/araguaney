# Contribuir a Araguaney

Gracias por el interés. Antes de nada, el contexto honesto:

**Araguaney tiene un solo mantenedor**, con trabajo de tiempo completo aparte.
Los issues y PRs se revisan con mejor esfuerzo, priorizando lo que afecta a
centros de acopio operando. Un PR pequeño y enfocado con tests tiene muchas
más probabilidades de mergearse rápido que uno grande.

## Qué ayuda más

1. **Reportes de operadores reales**: si usas Araguaney en un centro de acopio
   y algo estorba en el flujo (intake → caja → tarima → envío), un issue con
   pasos concretos vale oro.
2. **Arreglos de bugs con test de regresión.**
3. **Traducciones**: el sitio es ES/EN; el copy vive en
   `frontend/src/dictionaries/` y en los `CONTENT` de cada página.

## Qué probablemente no se mergee

- Features grandes sin discusión previa en un issue.
- Cambios que introduzcan datos personales de donantes o beneficiarios
  (es una línea de producto, no técnica: **no se registra PII**).
- Dependencias nuevas pesadas sin justificación.

## Setup de desarrollo

### Backend (FastAPI, Python 3.12)

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx
python -m pytest -q          # 187+ tests, sin servicios externos
```

La suite completa (incluidos los tests de aislamiento multi-tenant de
`tests/tenant/`) corre sobre SQLite en memoria — no necesitas Postgres ni
Redis para desarrollar. Para correr el servidor sí: copia `.env.example` a
`.env` y levanta Postgres local.

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev                  # rutas con locale: /es, /en
npx tsc --noEmit             # typecheck
```

## Reglas del código

- Multi-tenant: **todo** acceso a datos de dominio pasa por
  `TenantRepository.scoped(...)` o deriva `center_id` del usuario autenticado,
  nunca del cliente. Cualquier endpoint nuevo necesita su test en
  `tests/tenant/`.
- Convenciones de capas (routers → services → repositories), migraciones
  Alembic y Definition of Done: ver [`CLAUDE.md`](CLAUDE.md).
- Commits: formato convencional (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- En el copy visible: sin raya (—) como inciso; paréntesis, dos puntos o coma.

## Código de conducta

Al participar aceptas el [Código de Conducta](CODE_OF_CONDUCT.md).

## Licencia

Al contribuir aceptas que tu aporte se licencia bajo [AGPL-3.0](LICENSE).
