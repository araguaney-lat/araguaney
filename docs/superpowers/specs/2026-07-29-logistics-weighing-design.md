# Logística: pesaje por bulto, anexo Carta Porte y perfiles de paletizado — Diseño

**Fecha:** 2026-07-29
**Fase:** 21 (`docs/roadmap/phase-21-logistics-weighing.md`)
**Estado:** aprobado en sesión de diseño; la guía fiscal sujeta a revisión de fiscalista

---

## Premisas validadas (y corregidas)

| Premisa | Veredicto | Corrección |
|---|---|---|
| El pesaje por producto es engorroso; pesar a nivel caja/tarima, que es lo que valida la aerolínea | ✅ Válida | El dato que rige es el **bruto verificado en aceptación** (producto + empaque + tarima; el handler emite weighing slip que va a la guía aérea). Matiz: lo cobrable es `max(bruto, volumétrico)`: el volumen también manda. El sistema ya pesa por caja (opcional); lo que falta es el bruto de báscula por tarima |
| Carta Porte: requisito legal aunque la donación valga cero | ✅ Válida, y más seria | CFDI de traslado valor cero + complemento Carta Porte 3.1 en tramos federales; emite el propietario con medios propios o el transportista contratado (CFDI de ingreso). Excepciones: vehículo hasta C2 con tramo federal < 30 km de radio; particulares sin fines comerciales con topes. **Timbrar exigiría PAC + CSD + RFC emisor: Araguaney no se convierte en emisor fiscal.** El producto genera el anexo de datos; el timbrado es de quien transporta |
| Paletizado: no hay estándar único; compatibilidad con arcos de 1.60 m vs 1.80 m | ✅ Válida | Lower deck de pasajeros ≈ 160 cm con todo y base; main deck hasta 300 cm; túneles de rayos X varían por equipo (170, 180 cm). Conclusión: perfiles configurables por envío, no constante |

Fuentes: DHL/CargoAI/iContainers (chargeable weight), manuales y FAQ del SAT +
guías de PACs (Carta Porte 3.1, regla 2.7.1.51, excepciones), ship4wd/exfreight
(alturas por tipo de aeronave), Smiths Detection/WG (túneles de rayos X).

## Diseño

### 1. Pesaje en dos niveles: la caja y la tarima, ambas con báscula

> **Corregido durante la implementación.** El diseño original derivaba el peso
> de la caja del catálogo. Es falso: una caja llena lleva cartón, empaque,
> separadores y relleno, así que la suma de sus productos siempre queda corta.
> Pesar la caja cerrada sí es factible; pesar producto por producto no lo es.

- **Caja:** `boxes.weight_kg` es un **dato medido** — lo que marcó la báscula con
  la caja ya cerrada. El catálogo (`unit_weight_kg × cantidad`) se muestra al
  lado como referencia ("solo el contenido pesaría ~X kg") y **no** llena el
  campo: sirve para cachar un dedazo, no para sustituir la medición.
- **Tarima:** al cerrar, la UI pide el **peso bruto de báscula**
  (`pallets.gross_weight_kg`, nuevo) y la **altura** (`pallets.height_cm`,
  nuevo). Neto = bruto − tara (la tara ya existe). Se muestra la diferencia
  contra la suma de las cajas pesadas: se espera **positiva y pequeña**, porque
  la tarima carga base y emplaye. Negativa señala una caja mal pesada o una tara
  alta. Informativa, nunca bloqueante.
- **Manifiesto y documentos:** los totales por tarima y por envío usan el neto de
  la tarima cuando existe (bruto/tara/neto), y caen a la suma de cajas solo donde
  nadie pesó la tarima, diciéndolo. El peso que viaja al anexo Carta Porte es el
  de la tarima: es el bulto que se transporta.

### 2. Declaración de mercancías (datos, no timbrado)

> **Corregido durante la implementación.** El diseño original producía un anexo
> Carta Porte específico de México. Araguaney es software y opera en varios
> países: cubrir el régimen fiscal de cada uno es una carrera que se pierde
> sola, y nos pondría a opinar sobre reglas tributarias que no son nuestras. El
> documento es genérico, el código de mercancía es **HS** (el que usan casi 200
> países en aduana), la identidad del emisor la captura el propio centro, y
> México queda como un perfil opcional que solo traduce nombres de campo.

- Export por envío (`XLSX` + `JSON`) con el mapeo a los campos del complemento
  Carta Porte 3.1 de autotransporte: mercancías (descripción, clave
  producto-servicio SAT, cantidad, clave de unidad, peso en kg), peso bruto
  total, número de bultos, origen/destino. Encolado en ARQ como los exportes
  existentes; autenticado y rate-limited.
- **Explícitamente fuera:** timbrado, PAC, CSD, RFC. El anexo es el insumo que
  el transportista (CFDI de ingreso) o el centro con medios propios (CFDI de
  traslado) entrega a su PAC.
- **Guía para centros** en `/dashboard/ayuda`: quién emite según quién
  transporta, cuándo aplica la excepción de 30 km / C2, y que la donación con
  valor cero NO exime del complemento en tramo federal. Redactada como
  orientación operativa, con revisión de fiscalista antes de publicar (gated):
  la excepción por ayuda humanitaria (Regla 2.7.7 RMF) debe confirmarla un
  profesional.

### 3. Perfiles de paletizado

- Catálogo corto de perfiles (constantes en código, no tabla): `LOWER_DECK_160`
  (160 cm), `XRAY_170` (170 cm), `MAIN_DECK_180` (180 cm), `SIN_RESTRICCION`.
  Configurable a futuro si hace falta.
- `shipments.height_profile` (nuevo, nullable): el envío declara su restricción.
- Al cerrar una tarima que ya está asignada a un envío con perfil, o al agregar
  una tarima a un envío con perfil, se valida `height_cm` contra el perfil:
  **advertencia visible, no bloqueo** (quien está en el andén sabe más que el
  sistema).
- Guía de paletizado en `/dashboard/ayuda`: alturas por escenario, por qué la
  base de la tarima cuenta (160 cm incluyen los ~15 cm de la base), flejado y
  esquineros.

## Cambios de modelo (migración única, reversible)

```
pallets   + gross_weight_kg  Numeric(8,3) nullable   (báscula, al cerrar)
          + height_cm        Integer nullable        (al cerrar)
shipments + height_profile   String nullable + CHECK (perfiles del catálogo)
```

`boxes.weight_kg` no cambia de esquema; cambia su semántica en UI (estimado
pre-llenado). `product_types.unit_weight_kg` ya existe y hoy está casi vacío:
poblarlo para los tipos más comunes es parte de la fase.

## Qué NO entra (YAGNI)

- Timbrado de CFDI o integración con PAC (decisión explícita, no postergación).
- Peso volumétrico y dimensiones de caja (el sistema no captura dimensiones;
  se documenta en la guía, no se modela).
- Báscula conectada / hardware.
- Optimización automática de acomodo en tarima.

## Testing

- Neto = bruto − tara; discrepancia calculada y no bloqueante.
- Manifiesto: usa pesos pesados cuando existen, estimados marcados cuando no.
- Anexo Carta Porte: mapeo de campos completo contra un envío de fixture,
  totales consistentes con el manifiesto.
- Perfil de altura: advertencia al exceder, silencio bajo el límite, envíos sin
  perfil no advierten nada.
- Regresión: cerrar tarima sin báscula (campos vacíos) sigue funcionando.
