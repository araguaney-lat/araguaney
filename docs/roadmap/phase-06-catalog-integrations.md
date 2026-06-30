### Fase 6 — Integración de catálogos externos y estándares humanitarios ⬜

> Conectar el sistema con fuentes de datos internacionales para eliminar la captura manual de productos,
> garantizar el cumplimiento de estándares humanitarios (WHO, IFRC, IOM) y habilitar interoperabilidad
> con sistemas como RITA/Sahana Eden.
>
> Criterios de aceptación: un voluntario puede registrar "ibuprofeno 500 mg" escaneando el código de barras
> o escribiendo las primeras letras del INN, sin captura manual de concentración/forma/lote; los manifiestos
> exportados son compatibles con el formato RITA/Sahana.

---

#### Prerequisitos (cuentas gratuitas — acción manual)

| Servicio | URL | Para qué | Estado |
|----------|-----|---------|--------|
| UNSPSC / UNDP | https://www.ungm.org/UNSPSC | Descargar codeset completo en español | ⬜ Pendiente |
| GS1 / Verified by GS1 | https://www.gs1.org/services/verified-by-gs1 | 30 lookups/día gratis para validar GTIN | ⬜ Pendiente |

---

#### Backend — Semilla de catálogos (carga única)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Seed UNSPSC | Importar segmentos relevantes del codeset UNSPSC (57000000 Humanitarian Relief Items + familia de medicamentos y alimentos) como `product_categories`; script idempotente | 🟠 | ⬜ Pendiente |
| 2 | Seed WHO + ATC | Importar WHO Model List of Essential Medicines con nombre INN, código ATC, forma farmacéutica y concentración como `product_types` base para medicamentos | 🟠 | ⬜ Pendiente |
| 3 | Seed IFRC/ICRC + IOM | Importar catálogo de no-food items (mantas, kits, herramientas) con código de material IFRC y specs técnicas | 🟡 | ⬜ Pendiente |

---

#### Backend — APIs en tiempo real

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 4 | Open Food Facts — lookup por barcode | `GET /v1/catalog/barcode/{gtin}` → consulta Open Food Facts API y retorna nombre, categoría, caducidad recomendada; cacheable en Redis | 🟡 | ⬜ Pendiente |
| 5 | GS1 GTIN — validación | `GET /v1/catalog/gtin/{gtin}/validate` → verifica que el GTIN existe en GS1; rate-limited a 30/día; fallback graceful si cuota agotada | 🟡 | ⬜ Pendiente |
| 6 | RxNorm — normalización INN | `GET /v1/catalog/rxnorm/search?q=` → llama NLM RxNorm API, devuelve nombre INN normalizado y código RxNorm; para el autocomplete de medicamentos | 🟡 | ⬜ Pendiente |
| 7 | COFEPRIS — registro sanitario MX | `GET /v1/catalog/cofepris/search?q=` → scraping o consulta a base pública COFEPRIS; valida que el medicamento tiene registro sanitario en México | 🔴 | ⬜ Pendiente |

---

#### Frontend — Autocomplete y lookup

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 8 | Autocomplete de producto en intake | Campo `product_type` con búsqueda tipo-ahead que consulta `/v1/catalog/` y sugiere productos del catálogo WHO/IFRC/UNSPSC; seleccionar prellenea INN, forma, concentración | 🟠 | ⬜ Pendiente |
| 9 | Barcode → lookup automático | Al escanear barcode en intake, consultar Open Food Facts + GS1; prellenar nombre y categoría si hay match; mostrar alerta si GTIN desconocido | 🟡 | ⬜ Pendiente |

---

#### Interoperabilidad

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 10 | Export RITA/Sahana Eden | Manifiesto de envío exportable en formato XML compatible con RITA/Sahana Eden (campos: INN, lote, caducidad, cantidad, código UNSPSC, código IFRC) | 🔴 | ⬜ Pendiente |
| 11 | Export IFRC packing list | PDF/Excel del manifiesto con columnas exigidas por IFRC: código de material, descripción, unidad, cantidad, peso, valor | 🟡 | ⬜ Pendiente |

---

#### Home page — Sección de estándares

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 12 | Sección "Estándares que respaldamos" | Bloque en la home pública con logos/nombres de WHO, IFRC/ICRC, IOM, UNSPSC, GS1; texto breve que explica cómo cada uno garantiza la calidad del inventario y la trazabilidad; enlaza a la página de cada organismo | 🟢 | ⬜ Pendiente |

---

> **Nota sobre COFEPRIS (task 7):** La consulta pública de COFEPRIS no expone una API oficial;
> puede requerir scraping con aviso legal o un enfoque manual (CSV descargable periódicamente).
> Evaluar antes de implementar.
>
> **Nota sobre RITA/Sahana (task 10):** Interoperación de lectura (importar listas de necesidades de
> RITA) queda para una iteración posterior; esta fase solo cubre la exportación.
