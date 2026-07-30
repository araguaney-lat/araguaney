# Guía de Carta Porte para centros de acopio — BORRADOR

> ⚠️ **Borrador sin revisión fiscal.** No publicar ni enlazar hasta que lo revise
> un fiscalista (Fase 21, task 8). Contiene una pregunta abierta que solo un
> profesional puede cerrar: si existe una excepción aplicable a la ayuda
> humanitaria.

**Fase:** 21 · task 8 · Destino final: manual en `/dashboard/ayuda`, para coordinadores.

---

## Lo que hay que entender primero

**Que la donación valga cero no exime del trámite.** El complemento Carta Porte
acompaña a un CFDI de traslado con valor cero, y es exigible cuando la
mercancía circula por tramos de jurisdicción federal. Es un requisito de
control de mercancías en tránsito, no un impuesto sobre el valor.

**Araguaney no timbra.** La plataforma genera un **anexo de datos** con la
información de la carga (mercancías, claves del SAT, pesos, bultos, origen y
destino) para que quien deba emitir el comprobante lo entregue a su PAC.
Timbrar exigiría certificado de sello digital y RFC emisor, es decir convertir
a la plataforma en emisora fiscal, que es lo contrario del deslinde que sostiene
el resto del proyecto.

---

## Quién emite, según quién transporta

| Situación | Quién emite | Qué emite |
|---|---|---|
| El centro traslada con vehículo propio | El centro | CFDI de **traslado**, valor cero, con complemento Carta Porte |
| Se contrata a un transportista | El transportista | CFDI de **ingreso** con complemento Carta Porte |
| Una empresa dona el transporte | **Pregunta abierta** — ver abajo | — |

El tercer caso es común en emergencias y es una de las preguntas para la
revisión fiscal: no encaja limpiamente en ninguno de los dos supuestos
anteriores.

---

## Cuándo podría no hacer falta

Las fuentes secundarias mencionan estos supuestos. **Ninguno debe darse por
bueno sin confirmación profesional:**

- Vehículo que no excede las dimensiones y pesos de un camión tipo C2, cuando el
  tramo federal del recorrido no rebasa un radio de 30 km entre origen y destino.
- Traslados sin fines comerciales de bienes propios, con topes de distancia y
  peso.

Un traslado típico de centro de acopio al aeropuerto **probablemente excede**
esos límites. Asumir que aplica la excepción es el error caro.

---

## Qué hace la plataforma por ti

Desde el detalle de un envío puedes descargar el **anexo de datos Carta Porte**
(XLSX y JSON) con la información que el complemento pide:

- mercancías: descripción, clave de producto-servicio del SAT, cantidad, clave
  de unidad y peso en kilogramos;
- peso bruto total y número de bultos;
- origen y destino.

Ese archivo es el insumo. Quien emita el comprobante lo carga en su sistema de
facturación o se lo entrega a su PAC.

---

## Preguntas abiertas para la revisión fiscal

1. **¿Existe excepción para ayuda humanitaria?** La Regla 2.7.7 de la RMF se
   cita en fuentes secundarias como posible fundamento, pero no la pudimos
   confirmar en la fuente primaria. Es la pregunta más importante: si existe,
   cambia la operación de todos los centros.
2. **Transporte donado por un tercero:** ¿quién emite? ¿El transportista, aunque
   no cobre? ¿El centro, aunque el vehículo no sea suyo?
3. **Valor cero:** ¿es el tratamiento correcto para el traslado de una donación,
   o debe declararse un valor estimado de la mercancía?
4. **Excepción de 30 km / C2:** ¿aplica realmente a los trayectos de acopio a
   aeropuerto, o queda descartada en la práctica?
5. **Claves de producto-servicio:** el catálogo usa la taxonomía UNSPSC. ¿El
   mapeo automático a `c_ClaveProdServ` es aceptable, o cada mercancía debe
   clasificarse manualmente?

---

## Aviso

Este documento no es asesoría fiscal. Describe cómo la plataforma apoya el
trámite y qué preguntas quedan abiertas. Cada centro es responsable de cumplir
sus propias obligaciones fiscales, con el apoyo de su contador.
