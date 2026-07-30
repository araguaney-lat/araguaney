# Prevención de riesgos: exención de responsabilidad y anti-lavado en especie — Diseño

**Fecha:** 2026-07-29
**Fase:** 20 (`docs/roadmap/phase-20-risk-prevention.md`)
**Estado:** aprobado en sesión de diseño; cláusulas sujetas a revisión legal humana
**Relación:** la declaración del donante se integra en `/donar` (Fase 18) y en el
intake con donante registrado (Fase 19). Esta fase puede escribir todos los
textos y controles sin esperar a esas fases; los ganchos de UI se activan con ellas.

---

## Problema

Araguaney no maneja dinero (NO-objetivo #1), pero las donaciones en especie
tienen su propio vector de abuso: **usar la plataforma como canal logístico
gratuito y con apariencia legítima**. El escenario concreto: una empresa "dona"
producto comercial, y en el destino la misma empresa (o una relacionada) lo
recibe para venderlo. Eso es una variante de lavado basado en comercio (TBML) y
de fraude aduanero por simulación; varios ordenamientos lo tipifican como
"simular una operación de comercio exterior para obtener beneficio económico"
(p. ej. Ley de Delitos Aduaneros de Perú, art. 5). Las organizaciones benéficas
son el vector preferido porque reciben menos escrutinio que el comercio normal.

Además, los centros de acopio necesitan protección de responsabilidad: que un
abuso cometido por un donante no arrastre legalmente al centro ni a la
plataforma.

## Fuentes que sustentan el diseño

- FATF, *Recommendation 8 / Best Practices on Combating the Abuse of NPOs*:
  controles proporcionales al riesgo, "conoce a tu donante" escalonado,
  transparencia y registros. Explícitamente advierte contra controles que
  ahoguen la operación legítima.
- Fiscalía de California, *Gifts-in-Kind: How they can be used to deceive*:
  los esquemas dependen de que la organización nunca tome propiedad real de los
  bienes; el control es la transferencia de propiedad genuina e incondicional.
- ABA, *Fraudulent Donations to Charity*: due diligence del donante proporcional
  al riesgo del activo recibido.
- OMA, *Role of Customs in Humanitarian Crises*: los envíos de ayuda declaran su
  carácter no comercial en la documentación que acompaña la carga.
- Práctica estándar de plataformas (Donorbox, Pledge, Givebear): el proveedor de
  software declara no ser parte de la transacción de donación.

## El principio rector

> **La donación en especie es una transferencia de propiedad pura, simple,
> incondicional e irrevocable al centro de acopio.**

De ese principio se deriva todo lo demás: si el donante no conserva ningún
derecho sobre los bienes (no designa destinatario, no exige que su lote viaje
junto, no puede rastrearlo hasta un consignatario, no puede pedirlo de vuelta),
el esquema "yo mando gratis, yo recibo en destino" pierde su mecanismo. El
sistema ya se comporta así de facto: las cajas se mezclan en tarimas con
donaciones de terceros, el consignatario del envío es la contraparte
humanitaria, y no existen beneficiarios finales en el sistema (NO-objetivo #2).
Esta fase lo convierte en política declarada, cláusula aceptada y leyenda
documental.

## Las seis capas

### 1. Legal — Términos de Donación en Especie (documento nuevo, ES/EN)

Cláusulas núcleo:

1. **Transferencia irrevocable:** la donación transfiere la propiedad al centro
   de acopio de forma pura, simple, incondicional e irrevocable (figura del
   Código Civil Federal mexicano para donación pura). Sin derecho de retorno.
2. **Sin contraprestación ni beneficio:** el donante declara que no recibe ni
   espera pago, contraprestación, beneficio comercial o fiscal indebido.
3. **Sin designación de destino:** el donante no adquiere derecho alguno a
   designar destinatario, consignatario o beneficiario, ni a que sus bienes se
   mantengan agrupados o identificables en el destino.
4. **Procedencia lícita:** el donante declara que los bienes son de su legítima
   propiedad y procedencia lícita.
5. **Sin vínculo con el receptor:** el donante declara no tener vínculo de
   propiedad, control o interés económico con quien reciba los bienes en destino.
6. **Derecho de rechazo:** el centro puede rechazar cualquier donación, total o
   parcialmente, sin expresión de causa.
7. **No deducibilidad:** Araguaney y los centros no emiten recibos deducibles
   (no son donataria autorizada); la donación no genera derecho fiscal alguno.

### 2. Legal — Exención de responsabilidad de la plataforma

Se añade a los términos existentes (Fase 13):

- Araguaney es un **proveedor de software**: no es parte de la donación, no es
  propietario, transportista, consignatario ni intermediario de los bienes.
- Los centros de acopio son **operadores independientes**, responsables de
  aceptar, rechazar, custodiar y despachar las donaciones conforme a la ley
  aplicable.
- Araguaney no garantiza la licitud de los bienes registrados por terceros; la
  plataforma provee trazabilidad y auditoría como herramientas, no como aval.

### 3. Producto — declaración aceptada y registrada

- **`/donar` (Fase 18):** checkbox obligatorio de aceptación de los Términos de
  Donación antes de registrar. Se guarda versión y fecha
  (`donations.terms_version`, `terms_accepted_at`).
- **Intake con donante registrado (Fase 19):** persona moral acepta siempre
  (el capturador marca la aceptación presencial); física solo si se registra.
  Se guarda en el intake (`intakes.donor_terms_version` nullable).
- Los textos son versionados (constante en código + fecha), como la aceptación
  de términos existente de Fase 13.

### 4. Papel — leyenda en documentos de aduana

Manifiesto (PDF y XLSX), manifiesto de transferencia y etiquetas de tarima
ganan la leyenda:

> "Donación humanitaria sin valor comercial. Bienes transferidos de forma
> irrevocable al consignatario humanitario. / Humanitarian donation, no
> commercial value. Goods irrevocably transferred to the humanitarian consignee."

### 5. Personas — guía de banderas rojas y política de aceptación

Manual para coordinadores en `/dashboard/ayuda` (contenido en
`content/manuals/`), basado en FATF R.8 y la literatura de gift-in-kind:

**Banderas rojas (rechazar o escalar a `national_admin`):**
- Lote grande y homogéneo de producto comercial nuevo de una sola empresa,
  sin relación con las necesidades publicadas.
- El donante pregunta quién recibe en destino, pide que su lote viaje junto,
  o pide rastreo de sus bienes hasta la entrega.
- El donante pide documentación de la "entrega en destino" a nombre de un
  tercero específico.
- Donaciones recurrentes de alto valor del mismo donante sin explicación.
- El donante ofrece cubrir el transporte a cambio de decidir la ruta o el
  destino del envío.
- Negativa a identificarse siendo persona moral (la Fase 19 lo exige).

**Protocolo:** ante bandera roja, el coordinador no confronta: registra, escala
a `national_admin` con el detalle, y el centro ejerce su derecho de rechazo. El
rechazo queda como `REJECTED` con motivo (mecanismo existente).

**Política de aceptación (documento corto, público):** proporcionalidad FATF —
persona física con volumen doméstico: sin fricción adicional; persona moral o
volumen atípico (ver capa 6): identificación registrada (Fase 19) + aceptación
de términos.

### 6. Umbrales — volumen atípico en persona física

El escrutinio por tipo (moral → identificación siempre) tiene una evasión obvia:
registrarse como física. El umbral de volumen la cierra: **a partir de cierto
volumen, el anonimato se acaba sin importar el tipo de donante.**

**Umbral de escalamiento, no tope duro.** Un tope duro invita a la
estructuración (partir la donación en muchas bajo el límite, la técnica clásica
del lavado) y rechazaría el caso legítimo del donante grande de buena fe tras
una emergencia. En su lugar:

- **Umbral configurable** por variables de entorno
  (`DONATION_VOLUME_THRESHOLD_BOXES`, `_KG`). Se mide con lo que el sistema ya
  tiene: número de cajas/renglones y `weight_kg` cuando exista. No hay valor
  comercial que medir, y eso es deliberado.
  **Los valores operativos no se escriben en este repositorio, que es público:**
  viven solo en la configuración del entorno. El mecanismo se publica; el
  parámetro que determina cuándo salta, no.
- **En el intake:** una donación de física que supera el umbral no puede quedar
  anónima: exige registrar al donante (Fase 19) con email o teléfono de
  contacto. El sistema lo fuerza, no depende de la memoria del coordinador.
- **En el pre-registro (`/donar`):** el donante ya viene identificado, así que
  no se bloquea nada; la donación se marca **"volumen atípico"** y la vista de
  recepción lo muestra para que el doble check se haga con la guía de banderas
  rojas a la mano.
- **Límites duros solo anti-abuso de plataforma** (no anti-lavado): máximo de
  renglones por donación y de donaciones abiertas por donante en `/donar`
  (anti-spam, complementa Turnstile y rate limiting).

**Alcance del control:** el umbral actúa sobre cada donación, y el anonimato
bajo el umbral limita por definición la correlación entre capturas (no hay
identidad que correlacionar). El residuo queda cubierto por la guía de banderas
rojas, que trabaja sobre patrones que el coordinador sí observa, y por el propio
umbral, que acota lo que puede moverse sin identificación. Las implicaciones
operativas de ese residuo se detallan en el material interno de coordinadores,
no aquí.

## Qué NO es esta fase

- No implementa screening de sanciones/PEP ni verificación de identidad
  documental: desproporcionado para el riesgo actual (FATF R.8 pide
  proporcionalidad; hoy no se maneja dinero).
- No reactiva el bloque de donativos económicos (Fase 13, gated): sigue sin
  recibirse dinero.
- No convierte a los coordinadores en investigadores: su obligación termina en
  registrar, escalar y poder rechazar.
- **Las cláusulas no se publican sin revisión de un abogado mexicano** (tarea
  gated explícita). Este spec da el contenido técnico-operativo; la redacción
  final con validez legal la firma un profesional.

## Testing

- Aceptación de términos: no se puede registrar en `/donar` sin aceptar (cuando
  Fase 18 exista); la versión y fecha quedan guardadas.
- La leyenda aparece en manifiesto PDF/XLSX, transferencia y etiqueta de tarima
  (extiende `test_pdf_documents`).
- El manual de banderas rojas se sirve en `/dashboard/ayuda` en ES y EN.
- Umbral: intake de física sobre el umbral exige donante registrado; bajo el
  umbral queda anónimo; pre-registro sobre el umbral queda marcado "volumen
  atípico" y la recepción lo muestra. Umbral configurable por env.
