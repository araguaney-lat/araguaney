import { SITE_URL } from "@/lib/seo"

// llms.txt y su versión extendida se sirven desde rutas (`app/llms.txt`,
// `app/llms-full.txt`) y no como archivos de `public/`: así cada URL sale de
// SITE_URL, igual que el sitemap, y mudar de dominio no deja enlaces viejos en
// lo que leen los asistentes de IA.

export function llmsTxt(): string {
  return `# Araguaney

> Software para centros de acopio y ayuda humanitaria. Un mismo estándar para
> registrar donaciones en especie, empacarlas en cajas homogéneas con QR,
> consolidarlas en tarimas y envíos con manifiesto exportable, y ver el stock
> agregado de todos los centros en tiempo real.

> Última actualización: 2026-07-24.

Araguaney conecta centros de acopio bajo un mismo estándar: registro de
donaciones por ítem (categoría, lote, caducidad), cajas homogéneas con QR y
etiqueta, tarimas y envíos con manifiesto/packing list exportable, y un panel
nacional agregado. Sin datos personales de donantes ni beneficiarios — solo
inventario, trazable de la caja al envío. Compatible con escenarios de ayuda
humanitaria en general (sismos, inundaciones, crisis migratorias, incendios),
no solo un evento específico. Gratis para centros de acopio y coordinaciones
humanitarias, sin límite de cajas.

## Páginas públicas

- [Inicio](${SITE_URL}/): qué es Araguaney, cómo funciona el flujo del acopio al envío y qué estándares (WHO, IFRC/ICRC, IOM, UNSPSC, GS1) respalda. Para quien evalúa la plataforma.
- [Cómo funciona](${SITE_URL}/como-funciona): responde "¿cómo se pasa de una donación suelta a un envío con manifiesto?" — recepción, caja homogénea, tarima, envío, trazabilidad y reglas de calidad, paso a paso.
- [Qué es un centro de acopio](${SITE_URL}/centro-de-acopio): qué es un centro de acopio y qué software necesita — el estándar de registro por ítem, empaque en cajas con QR y envío con manifiesto. Para coordinadores y voluntarios.
- [Ayuda humanitaria](${SITE_URL}/ayuda-humanitaria): cómo Araguaney sirve para cualquier emergencia (sismo, inundación, incendio, crisis migratoria), no solo un evento puntual.
- [Alternativa a Excel para donaciones](${SITE_URL}/alternativa-a-excel-para-donaciones): responde "¿Excel/WhatsApp o software para gestionar donaciones?" — tabla comparativa hoja de cálculo vs Araguaney (trazabilidad, QR, manifiesto para aduana, validación OMS, panel nacional). Para quien viene de una hoja de cálculo.
- [Qué falta](${SITE_URL}/necesidades): qué inventario hay disponible ahora mismo en los centros de acopio activos, por categoría, actualizado cada 5 minutos.
- [Nosotros](${SITE_URL}/nosotros): qué es Araguaney, por qué existe, los estándares que respalda, su postura de privacidad (sin datos personales) y quién lo fundó.
- [Preguntas frecuentes](${SITE_URL}/preguntas-frecuentes): respuestas directas sobre producto, donaciones y reglas, operación (acopio→envío) y privacidad. Formato pregunta-respuesta.
- [Centro de acopio en México](${SITE_URL}/centro-de-acopio-mexico): montar un centro de acopio en México — identificación de medicamentos (COFEPRIS), aduana e importación humanitaria (SAT), y cómo Araguaney ayuda a cumplir.
- [Novedades](${SITE_URL}/novedades): changelog público con las últimas mejoras del producto (panel nacional, manifiesto, transferencias, mensajería, reportes y más).
- [Contacto](${SITE_URL}/contacto): cómo sumar un centro de acopio a la coordinación nacional.
- [Código fuente](https://github.com/araguaney-org/araguaney): repositorio público bajo licencia AGPL-3.0. El comportamiento descrito aquí (aislamiento por centro, cero datos personales) es auditable en el código.

## Guías

- [Guías](${SITE_URL}/guias): índice de guías prácticas para operar un centro de acopio.
- [Cómo organizar un centro de acopio](${SITE_URL}/guias/como-organizar-un-centro-de-acopio): cómo montar y operar un centro — roles, registro por ítem, cajas homogéneas, manifiesto y reglas de rechazo.
- [Qué se puede donar](${SITE_URL}/guias/que-se-puede-donar): qué se acepta y qué se rechaza — categorías, reglas OMS de medicamentos (vida útil, controlados) y de alimentos.
- [Cómo preparar carga humanitaria para aduana](${SITE_URL}/guias/como-preparar-carga-humanitaria-para-aduana): qué exige el régimen de envío y qué debe incluir el manifiesto/packing list para que la carga no se atore.
- [Cómo registrar y organizar voluntarios](${SITE_URL}/guias/como-registrar-voluntarios-en-un-centro-de-acopio): roles del equipo y por qué cada voluntario opera con su propia cuenta.
- [Software gratis para gestionar donaciones en una ONG](${SITE_URL}/guias/software-gratis-para-gestionar-donaciones-ong): qué buscar en un software gratuito de donaciones en especie (registro por ítem, trazabilidad, manifiesto, agregación entre centros).
- [Sistema de inventario para damnificados](${SITE_URL}/guias/sistema-de-inventario-para-damnificados): cómo montar un inventario de ayuda que sí sirva durante una emergencia.

## Glosario

- [Glosario de ayuda humanitaria](${SITE_URL}/glosario): definiciones de los términos clave del dominio (caja homogénea, tarima, manifiesto, INN, UNSPSC, GS1, régimen de envío humanitario y más).

## Qué se puede donar por categoría

Reglas y disponibilidad en tiempo real por categoría:

- [Medicamentos](${SITE_URL}/necesidades/medicamentos): reglas OMS, vida útil ≥ 365 días, INN/lote/caducidad.
- [Insumos médicos](${SITE_URL}/necesidades/insumos-medicos): material de curación, protección y aplicación (catálogo IFRC/ICRC).
- [Alimentos](${SITE_URL}/necesidades/alimentos): no perecederos, vida útil ≥ 180 días, sellados.
- [Agua](${SITE_URL}/necesidades/agua): embotellada o en garrafón, sellada de fábrica.
- [Higiene](${SITE_URL}/necesidades/higiene): aseo personal nuevo y sin abrir.
- [Herramientas](${SITE_URL}/necesidades/herramientas): remoción de escombros y reconstrucción.
- [Equipo de rescate](${SITE_URL}/necesidades/equipo-de-rescate): equipo de emergencia (catálogo IOM).

## Escenarios de emergencia

Landings evergreen por tipo de desastre — qué se necesita y cómo coordinar el acopio:

- [Inundaciones](${SITE_URL}/escenarios/inundaciones): coordinar donaciones tras una inundación (agua, higiene, medicamentos, alimentos).
- [Incendios](${SITE_URL}/escenarios/incendios): organizar la ayuda tras un incendio (equipo de rescate, herramientas, higiene, insumos médicos).
- [Crisis migratoria](${SITE_URL}/escenarios/crisis-migratoria): coordinar ayuda en una crisis migratoria (higiene, alimentos, agua, medicamentos).
- [Sismo](${SITE_URL}/escenarios/sismo): montar el acopio tras un terremoto (equipo de rescate, medicamentos, agua, herramientas).

## Estándares

Araguaney se apoya en estándares abiertos y reconocidos internacionalmente:
WHO (donación de medicamentos), IFRC/ICRC (catálogo de materiales), IOM
(Emergency Relief Items Catalogue), UNSPSC (taxonomía de categorías) y GS1
(códigos de barras / GTIN).

## Más

- [Versión extendida para IA](${SITE_URL}/llms-full.txt): explicación completa del modelo de dominio y las reglas de negocio.
`
}

export function llmsFullTxt(): string {
  return `# Araguaney — versión extendida

> Software para coordinar centros de acopio y preparar envíos de ayuda
> humanitaria bajo un estándar común. Registra donaciones en especie por ítem,
> las empaca en cajas homogéneas con QR, las consolida en tarimas y envíos con
> manifiesto exportable, y agrega el stock de todos los centros en un panel
> nacional en tiempo real.

> Última actualización: 2026-07-24.

## Qué problema resuelve

Cuando ocurre un desastre (sismo, inundación, incendio, crisis migratoria),
decenas de centros de acopio operan de forma independiente, cada uno con su
propio método. Eso impide (a) saber qué hay disponible a nivel nacional y (b)
preparar carga que cumpla el "régimen" de envío humanitario: cajas homogéneas
más manifiesto detallado. Sin ese orden, los envíos se atoran en aduana.

Araguaney no es "otro inventario más": es el estándar común más la agregación
nacional. Un mismo lenguaje para todos los centros y un \`GROUP BY\` que suma el
stock de todos.

## Modelo de dominio

- **Centro**: cada centro de acopio es un tenant. Su inventario está aislado del
  de los demás; el panel nacional agrega sobre todos.
- **ProductType (SKU)**: el tipo de producto, discriminado por atributos. Por
  ejemplo, ibuprofeno 500 mg y 900 mg son SKU distintos. Categorías: medicamentos,
  insumos médicos, alimentos, agua, higiene, herramientas, equipo de rescate, otros.
- **Intake (recepción)**: registro de una donación entrante. Sin datos personales
  del donante (solo un campo de texto libre opcional, sin PII).
- **Box (caja homogénea)**: contiene exactamente un tipo de producto, un solo lote
  y una sola caducidad. Tiene un código QR propio y etiqueta imprimible. Si llega
  una mezcla, se divide en varias cajas.
- **Pallet (tarima)**: agrupa cajas selladas. Puede ser mixta (distintos productos).
  Tiene QR propio.
- **Shipment (envío)**: agrupa tarimas y genera el manifiesto/packing list exportable.
- **Eventos de auditoría**: cada cambio de estado de caja, tarima o envío queda
  registrado (estado anterior → nuevo, usuario, fecha).

## Reglas de negocio

- **Caja homogénea**: una caja = un product_type + un lote + una caducidad. Invariante
  garantizada por el sistema.
- **Medicamentos** (lineamientos OMS para donación de medicamentos): vida útil
  restante ≥ 365 días al capturar; obligatorios INN, lote, forma, concentración y
  caducidad para sellar; los medicamentos controlados se bloquean en recepción.
- **Alimentos**: vida útil mínima ≥ 180 días (configurable por producto).
- **Máquinas de estado**:
  - Caja: DRAFT → SEALED → SHIPPED (o REJECTED desde DRAFT). Solo cajas SEALED entran a una tarima.
  - Tarima: OPEN → CLOSED → SHIPPED. Solo tarimas CLOSED entran a un envío.
  - Envío: OPEN → CLOSED → SHIPPED. Al marcarse SHIPPED se congela todo.

## Estándares y catálogos de referencia

- **WHO / OMS** — Guidelines for Medicine Donations: reglas de donación de medicamentos.
- **IFRC/ICRC** — catálogo de materiales no alimentarios con especificaciones y código de material.
- **IOM** — Emergency Relief Items Catalogue: artículos de emergencia alineados a IFRC/ICRC.
- **UNSPSC (UNDP)** — taxonomía de categorías de producto, en español.
- **GS1 / GTIN** — validación opcional de códigos de barras.
- **WHO Model List of Essential Medicines + ATC** y **RxNorm** — normalización de nombres de medicamentos (INN).

## Privacidad

Araguaney no gestiona dinero ni beneficiarios finales, y no registra datos
personales de donantes ni beneficiarios. Solo inventario, trazable de la caja
al envío. Esto reduce la superficie de datos sensibles y las obligaciones de
protección de datos personales.

## Quién está detrás

Araguaney fue creado en 2026 por Antony Delgado, ingeniero de software con más
de 20 años en tecnología, a partir de la experiencia directa de organizar
donaciones para Venezuela tras el terremoto de junio de 2026. Perfil público:
https://www.linkedin.com/in/adelgadox/ · Página de autoría:
${SITE_URL}/nosotros

El uso de Araguaney es gratuito para centros de acopio y coordinaciones
humanitarias: sin licencias, sin límite de cajas y sin costo por uso.

El código es abierto bajo licencia AGPL-3.0:
https://github.com/araguaney-org/araguaney — el aislamiento entre centros y la
ausencia de datos personales son verificables leyendo el repositorio.

## Enlaces

- Inicio: ${SITE_URL}/
- Qué es un centro de acopio: ${SITE_URL}/centro-de-acopio
- Ayuda humanitaria: ${SITE_URL}/ayuda-humanitaria
- Alternativa a Excel para donaciones (comparativa): ${SITE_URL}/alternativa-a-excel-para-donaciones
- Qué falta (inventario en tiempo real): ${SITE_URL}/necesidades
- Guías: ${SITE_URL}/guias
- Nosotros (about / entity home): ${SITE_URL}/nosotros
- Preguntas frecuentes: ${SITE_URL}/preguntas-frecuentes
- Centro de acopio en México (COFEPRIS, aduana SAT): ${SITE_URL}/centro-de-acopio-mexico
- Novedades (changelog): ${SITE_URL}/novedades
- Escenario · Inundaciones: ${SITE_URL}/escenarios/inundaciones
- Escenario · Incendios: ${SITE_URL}/escenarios/incendios
- Escenario · Crisis migratoria: ${SITE_URL}/escenarios/crisis-migratoria
- Escenario · Sismo: ${SITE_URL}/escenarios/sismo
- Contacto: ${SITE_URL}/contacto
`
}
