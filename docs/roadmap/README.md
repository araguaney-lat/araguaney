# Acopio — Roadmap

## Progreso general

```mermaid
pie title Tareas completadas (351 tareas)
    "Listas" : 321
    "Pendientes" : 30
```

| Fase | Nombre | Listas | Pendientes | Progreso |
|------|--------|-------:|-----------:|----------|
| 0 | [Scaffolding + multi-tenant + roles](phase-00-scaffolding.md) | 18 | 0 | ✅ 100% |
| 1 | [Catálogo e intake con validaciones](phase-01-catalog-intake.md) | 8 | 0 | ✅ 100% |
| 2 | [Caja homogénea, QR y etiqueta](phase-02-box-qr-label.md) | 6 | 0 | ✅ 100% |
| 3 | [Tarima, envío y manifiesto](phase-03-pallet-shipment-manifest.md) | 9 | 0 | ✅ 100% |
| 4 | [Panel agregado nacional + endurecimiento + OTP + scanning móvil](phase-04-national-dashboard-hardening.md) | 23 | 2 | ✅ 92% |
| 5 | [Studio — panel de administración + solicitudes](phase-05-studio.md) | 39 | 0 | ✅ 100% |
| 6 | [Catálogos de referencia + lookups en tiempo real](phase-06-catalog-integrations.md) | 37 | 0 | ✅ 100% |
| 7 | [Transferencias entre centros](phase-07-transfers.md) | 21 | 0 | ✅ 100% |
| 8 | [Mensajería entre usuarios](phase-08-messaging.md) | 22 | 0 | ✅ 100% |
| 9 | [Reportes de campaña](phase-09-reports.md) | 8 | 0 | ✅ 100% |
| 10 | [Endurecimiento de seguridad (post-auditoría)](phase-10-security-hardening.md) | 22 | 0 | ✅ 100% |
| 11 | [SEO y reposicionamiento genérico](phase-11-seo-positioning.md) | 26 | 0 | ✅ 100% |
| 12 | [Optimización y rendimiento](phase-12-optimization.md) | 29 | 0 | ✅ 100% |
| 13 | [Compliance y legal](phase-13-compliance-legal.md) | 8 | 10 | 🟡 44% |
| 14 | [Auto-registro de centros con aprobación](phase-14-center-self-registration.md) | 17 | 0 | ✅ 100% |
| 15 | [Deliverability de emails + aviso de solicitudes](phase-15-email-deliverability.md) | 15 | 0 | ✅ 100% |
| 16 | [Rediseño de plantillas de email con marca](phase-16-email-brand-redesign.md) | 10 | 0 | ✅ 100% |
| 17 | [AEO/GEO + expansión de keywords](phase-17-aeo-keyword-expansion.md) | 3 | 18 | 🟡 14% |
| **Total** | | **321** | **30** | **🟡 91%** |

> **Pendientes (33):**
> - **12 gated por pago/decisión de negocio:** Fase 4 → 2 (spend caps + alertas, requieren plan
>   de pago de infra). Fase 13 → 10 (bloque de donativos/pagos: entidad receptora, asesoría
>   legal/contable, procesador de pagos, T&C de donación, transparencia — gated tras la decisión
>   "¿recibir donativos?").
> - **18 nuevas (Fase 17 — AEO/GEO + expansión de keywords):** trabajo de posicionamiento
>   ejecutable sin gate de pago (Bing/IndexNow, entidad/Wikidata, escenarios, frescura,
>   medición de visibilidad en IA). Tasks 4 (host canónico), 5 (señales de entidad) y 10
>   (página comparativa vs Excel) ✅.

> Envs opcionales (Sentry, Slack, Google Safe Browsing, Encryption Key) se pueden agregar en cualquier momento sin cambios de código.

---

## Dependencias entre fases

```
Fase 0 ─► Fase 1 ─► Fase 2 ─► Fase 3 ─► Fase 4
                └──────────────► (panel agregado usa datos de 1–3)
                                              │
                                              └──► Fase 5 (Studio)
```

- Fase 4 (endurecimiento + scanning móvil) puede solaparse con 2–3 según prioridad mediática.
- Fase 5 (Studio) depende de Fase 0 (usuarios/roles) pero es independiente de 1–4; puede arrancarse en paralelo.
- Fase 7 (Transferencias) depende de Fases 1–3 (Box/Pallet/Shipment ya deben existir) y de Fase 6 (campaign_id en intakes, scoping de ProductType).
- Fase 8 (Mensajería) depende de Fase 6 (user_campaigns ya debe existir para validar el scope de campaña).

---

## Notas de edición

Cada fase vive en su propio archivo bajo `docs/roadmap/`. Al editar:

- Actualiza el archivo de fase con el cambio de tarea (✅ Done / 🟡 In progress / ⬜ Pendiente).
- Actualiza los totales y el pie chart en este índice al completar o agregar tareas.
- Nuevas fases: archivo `phase-NN-<slug>.md` + fila en la tabla de arriba.
