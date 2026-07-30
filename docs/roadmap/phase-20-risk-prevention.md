# Fase 20 — Prevención de riesgos: exención de responsabilidad y anti-lavado en especie

> Protege a los centros y a la plataforma del abuso de las donaciones en especie
> como canal de lavado basado en comercio: una empresa "dona" producto comercial
> y una parte relacionada lo recibe en destino. El control rector: la donación es
> una transferencia de propiedad **pura, incondicional e irrevocable**, sin
> derecho a designar destino ni rastrear los bienes. Seis capas: cláusulas,
> exención de plataforma, aceptación registrada, leyenda en documentos, guía de
> banderas rojas para coordinadores y umbral de volumen atípico (el anonimato se
> acaba con el volumen, sea física o moral; escalamiento, nunca tope duro).
>
> **Spec:** `docs/superpowers/specs/2026-07-29-risk-prevention-design.md`
> **Base:** FATF R.8 (controles proporcionales al riesgo), literatura de fraude
> gift-in-kind (Fiscalía de California, ABA), práctica de la OMA en envíos
> humanitarios y de plataformas de donación (proveedor de software no es parte).
> **Relación:** los ganchos de UI viven en `/donar` (Fase 18) y en el intake con
> donante registrado (Fase 19); los textos y documentos no dependen de nadie.
> **Gate:** ninguna cláusula se publica sin revisión de abogado (task 7).

---

## Objetivos

1. Cerrar el esquema "yo dono gratis, yo recibo en destino": sin designación de
   consignatario, sin lotes rastreables, sin derecho de retorno.
2. Deslindar a la plataforma (proveedor de software) y a los centros (operadores
   independientes con derecho de rechazo).
3. Darle a los coordinadores criterios concretos (banderas rojas) y un protocolo
   que no los convierta en investigadores: registrar, escalar, rechazar.
4. Que cada aceptación de términos quede registrada con versión y fecha.

## No-objetivos (MVP)

- Screening de sanciones/PEP o verificación documental de identidad
  (desproporcionado hoy: no se maneja dinero; FATF pide proporcionalidad).
- Donativos económicos (bloque de Fase 13, sigue gated).
- Detección automática de patrones sospechosos (v2 posible sobre la auditoría).

---

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Términos de Donación en Especie (doc legal, ES/EN) | Las 7 cláusulas del spec: transferencia irrevocable, sin contraprestación, sin designación de destino, procedencia lícita, sin vínculo con el receptor, derecho de rechazo, no deducibilidad. Página legal pública versionada, patrón de los términos de Fase 13. | 🔴 Alta | ⬜ |
| 2 | Exención de responsabilidad de plataforma | Ampliar los términos existentes: Araguaney = proveedor de software, no es parte de la donación ni transportista ni consignatario; centros = operadores independientes. ES/EN. | 🟠 Media | ⬜ |
| 3 | Aceptación registrada en producto | `donations.terms_version/terms_accepted_at` (gancho en `/donar`, Fase 18) e `intakes.donor_terms_version` (gancho en intake con donante, Fase 19; moral siempre). Textos versionados por constante. Migración pequeña y reversible. | 🟠 Media | ⬜ |
| 4 | Leyenda en documentos de aduana | "Donación humanitaria sin valor comercial. Bienes transferidos de forma irrevocable al consignatario humanitario" (ES/EN) en manifiesto PDF y XLSX, manifiesto de transferencia y etiqueta de tarima. Extiende `test_pdf_documents`. | 🟠 Media | ⬜ |
| 5 | Guía de banderas rojas (manual de coordinadores) | Manual en `content/manuals/` servido en `/dashboard/ayuda` (ES/EN): las 6 banderas del spec + protocolo registrar→escalar→rechazar (usa el `REJECTED` con motivo existente). | 🟠 Media | ⬜ |
| 6 | Política de aceptación de donaciones (doc público corto) | Proporcionalidad FATF: física con volumen doméstico sin fricción; moral o volumen atípico → identificación (Fase 19) + aceptación de términos. Derecho de rechazo sin causa. | 🟠 Media | ⬜ |
| 7 | Revisión legal humana (GATED) | Abogado con práctica en México revisa cláusulas, exención y política antes de publicarlas. Hasta entonces los textos viven como borrador no enlazado. | 🔴 Alta | ⬜ |
| 8 | Control estructural documentado | Declarar en `docs/security.md` y en el spec de la 18 que el donante no puede designar consignatario ni rastrear bienes a destino, y que la mezcla de cajas en tarimas es un control anti-abuso deliberado, no un accidente. | 🟢 Baja | ⬜ |
| 9 | `CLAUDE.md` + roadmap | Registrar la política de prevención de riesgos en el contexto del proyecto; actualizar totales. | 🟢 Baja | ⬜ |
| 10 | Umbral de volumen atípico | Configurable por env (cajas y kg). Intake: física sobre el umbral no puede quedar anónima, exige donante registrado (Fase 19). Pre-registro: marca "volumen atípico" visible en la recepción (Fase 18). Límites duros solo anti-abuso en `/donar` (máx. renglones por donación, máx. donaciones abiertas por donante). Sin tope duro de donación: el umbral escala a revisión humana, no rechaza. Tests de ambos lados del umbral. | 🟠 Media | ⬜ |

---

## Orden sugerido

1 → 2 → 6 (textos) → 7 (revisión legal, en paralelo desde que 1 tenga borrador) →
3 → 4 → 10 (producto y papel) → 5 → 8 → 9 (operación y cierre). Nada se publica al
público antes de que 7 apruebe los textos.

## Definition of Done de la fase

- Los Términos de Donación en Especie existen en ES/EN, versionados y revisados
  por abogado.
- La plataforma queda deslindada por escrito; los centros con derecho de rechazo
  explícito.
- Toda aceptación queda registrada con versión y fecha.
- El manifiesto y la etiqueta de tarima declaran el carácter no comercial e
  irrevocable de la carga.
- Los coordinadores tienen la guía de banderas rojas en su manual y el protocolo
  no les exige investigar a nadie.
- El control estructural (no designación de destino, mezcla en tarimas) está
  documentado como política.
- Sobre el umbral de volumen no existe el anonimato; bajo el umbral no se añade
  fricción alguna.
