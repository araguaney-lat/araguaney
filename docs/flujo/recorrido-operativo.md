# Recorrido operativo: de la donación al envío

Este documento cuenta el camino completo, en orden, tal como lo vive quien opera
un centro de acopio. No hace falta saber nada técnico para seguirlo.

Los manuales por sección viven dentro de la aplicación, en **Ayuda**
(`/dashboard/ayuda`). Este recorrido es el hilo que los une: qué va antes de qué,
y por qué.

> **Regla que explica casi todo el diseño:** nada salta pasos. Una caja no entra
> a una tarima hasta estar sellada, y una tarima no entra a un envío hasta estar
> cerrada. El orden no es burocracia: es lo que hace que el manifiesto sea cierto.

---

## Quién es quién

| Rol | Dónde opera | Qué hace |
|---|---|---|
| **Voluntario** | Su centro | Recibe donaciones, arma cajas, las sella e imprime etiquetas |
| **Coordinador** | Su centro | Todo lo del voluntario, más tarimas, envíos, manifiestos y el equipo de su centro |
| **Administración nacional** | Todos los centros | Crea centros, campañas y catálogo; ve el agregado nacional; resuelve revisiones |
| **Donante** | Sin cuenta | Puede registrar su donación en línea antes de llevarla, o llegar sin registrar |
| **Superadmin** | La plataforma, en `/studio` | Hoy: métricas, solicitudes de centro, rebotes de correo y gasto de IA. La gestión de usuarios y la auditoría todavía se hacen desde `/dashboard`. No opera un centro |

---

## Parte 1 · Preparar el terreno (una sola vez)

Esto lo hace la administración nacional antes de que llegue la primera donación.
Si falta algo de aquí, la recepción se traba.

### 1. Dar de alta los centros

En **Centros**. Además del nombre y la ciudad, conviene capturar la razón social,
la identificación fiscal y el domicilio del centro: son los datos que después se
imprimen tal cual en los documentos de transporte.

Un centro también puede postularse solo desde la página pública
(*Registrar centro*). Esa solicitud llega a **Solicitudes de centro** para que la
administración la apruebe o la rechace.

### 2. Crear las cuentas

En **Usuarios**. La administración nacional crea coordinadores y voluntarios de
cualquier centro; un coordinador puede crear voluntarios, pero solo de su propio
centro, desde **Equipo**.

Quien recibe una cuenta nueva vive esto la primera vez:

1. Le llega un correo con una clave temporal.
2. Entra y el sistema le obliga a cambiar la contraseña.
3. Acepta los términos de uso.
4. Recién ahí ve el tablero.

### 3. Sembrar el catálogo

En **Catálogo**. El catálogo es la lista de productos que el sistema reconoce:
"Ibuprofeno 500 mg tabletas" es un producto distinto de "Ibuprofeno 900 mg".
Esa distinción es la que después permite sumar stock a nivel nacional sin mezclar
peras con manzanas.

**Solo la administración nacional puede crear productos.** Un voluntario los
busca, no los inventa. Si en plena recepción falta un producto en el catálogo,
la captura se detiene hasta que alguien de administración lo dé de alta: vale la
pena sembrarlo antes de abrir las puertas.

Al crear un producto se define su categoría (medicamento, alimento, agua,
higiene, insumo médico, herramienta, equipo de rescate u otro), si es un producto
controlado, y cuánta vida útil mínima exige. Para medicamentos hay tres campos
que no son opcionales: nombre genérico (INN), forma farmacéutica y concentración.
Sin ellos, la caja no se podrá sellar.

### 4. Abrir la campaña

En **Campañas**. Una campaña es el envío que se está armando: nombre, país de
origen, país de destino y fechas.

Al crearla se pueden elegir centros participantes, y con eso **todos los usuarios
activos de esos centros quedan inscritos de una vez**. Esto importa más de lo que
parece: quien no está inscrito en una campaña no puede capturar donaciones para
ella ni ver su reporte. Si alguien reporta que "no le aparece ninguna campaña" o
que "el reporte sale vacío", casi siempre es esto.

Existe siempre una campaña llamada **Donaciones Generales**, donde todo el mundo
está inscrito. Es la que se usa cuando no hay una campaña específica.

---

## Parte 2 · La donación llega

Hay dos caminos, y ambos terminan en el mismo lugar.

### Camino A · El donante se registró antes (recomendado)

Desde la página pública **Donar**, cualquier persona escribe lo que va a llevar
en lenguaje natural ("20 latas de atún", "3 cobijas"), con su nombre y correo.
No necesita saber nombres técnicos ni tener cuenta.

1. Registra su donación y acepta los términos.
2. Le llega un correo para confirmar.
3. Al confirmar recibe **su código QR** (empieza con `DN-`), que puede mostrar en
   el celular o imprimir.
4. Mientras no la lleve, puede editarla, agregarle fotos o cancelarla desde el
   enlace de su correo.

En el centro, el voluntario escanea ese QR desde **Escanear** y cae en la
donación. Ahí hace el **doble check**: marca lo que no llegó o llegó dañado, y
agrega lo que la persona trajo de más. Lo que no se marca se da por recibido,
porque el caso normal es que todo llegue. Al donante le llega un resumen por
correo de lo que efectivamente se recibió.

Terminado el doble check, el botón para capturar lleva directo a la recepción,
ya con el donante identificado. No hay que teclearlo de nuevo.

> El donante puede llevar su donación a **cualquier** centro, no solo al que
> eligió al registrarse. Lo que eligió era una intención; lo que se registra es
> el hecho.

### Camino B · El donante llega sin registrarse

Se va directo a **Recepción → Nueva**. Es el camino de siempre.

### En ambos casos: la recepción

Esta es la pantalla clave, y la que más confusión genera al principio:

> **La caja no se crea antes. La caja nace de la recepción.**

En la recepción se elige la campaña y se agrega **un renglón por cada caja** que
se va a armar. Por renglón: el producto (buscándolo por nombre, por código de
barras tecleado, o escaneándolo con la cámara), la cantidad, la unidad, el lote,
la caducidad y el peso.

Al guardar, el sistema crea todas las cajas de golpe, cada una con su propio
código y su QR.

**El donante es anónimo por default.** Hay una casilla para registrarlo si la
persona quiere identificarse, y en ese caso se capturan sus datos y su aceptación
de los términos de donación. Quien dona a nombre de una empresa siempre acepta
los términos.

Hay una excepción: por encima de cierto volumen, una donación deja de poder
quedar anónima y el sistema pide identificar a quien dona. Cualquier excepción a
esa regla queda registrada con su motivo y escala a la coordinación. Es un
control de escalamiento, no un freno en el mostrador: en plena emergencia,
detener la fila no recupera nada, y lo que sí sirve es que quede el rastro.

Esos casos aparecen en **Revisiones**, donde la administración nacional los
aprueba o los rechaza.

### Si el centro está en un sótano

Muchos centros operan bajo tierra o en bodegas sin cobertura. La recepción
—**y solo la recepción**— funciona sin conexión: se guarda en el teléfono y se
va sola cuando vuelve la señal.

Lo que hay que hacer es una cosa, y hay que hacerla arriba, con señal: **abrir
la aplicación antes de bajar.** Al abrirla descarga el catálogo y aparta un
bloque de códigos de caja, que es lo que permite imprimir la etiqueta en el
momento. Sin ese paso, abajo no hay con qué trabajar.

Y una al salir: **volver a abrir la aplicación y esperar a que el contador de
pendientes llegue a cero.** Mientras no marque cero, esas capturas existen solo
en ese teléfono. Si se cierra la aplicación con capturas en cola, el navegador
avisa.

Sellar, armar tarimas y cerrar envíos **no** funcionan sin conexión, y no es una
limitación pendiente de arreglar: dependen del estado de cajas que puede estar
cambiando en otro dispositivo. Decidir a ciegas produciría dos verdades sobre la
misma caja.

Si el servidor rechaza una captura al sincronizar —una caducidad corta, un
producto controlado—, no se descarta: queda en **Recepción → Pendientes** con el
motivo, esperando a que una persona la corrija o la descarte. El manual completo
está en *Ayuda → Sin conexión*.

### Lo que el sistema rechaza solo

Al guardar, cada caja queda en uno de dos estados: **borrador** (lista para
sellarse) o **rechazada**. Se rechaza sola cuando:

- El producto está marcado como controlado (nunca se acepta).
- A un medicamento le queda menos de un año de vida útil.
- A un alimento o al agua les queda menos de medio año.
- Falta la fecha de caducidad donde es obligatoria.
- Falta el lote de un medicamento.
- El producto del catálogo no tiene completos sus datos de medicamento.

Una caja rechazada se queda como registro (sirve para medir cuánto se rechaza y
por qué), pero no avanza: no se sella, no entra a una tarima, no viaja.

---

## Parte 3 · La caja

En **Cajas** está todo lo capturado, filtrable por estado.

1. **Sellar.** Una caja sellada ya no se edita. Es la promesa de que lo que dice
   la etiqueta es lo que hay adentro. Al sellar, el sistema revisa por segunda
   vez los requisitos de medicamentos.
2. **Imprimir etiquetas.** Se genera un PDF con las etiquetas de las cajas
   seleccionadas. Tarda unos segundos porque se arma en segundo plano; la
   pantalla avisa cuando está listo.
3. **Verificar.** Escanear el QR de una caja abre su ficha pública: qué contiene,
   de qué lote, con qué caducidad, de qué centro. Sin contraseña, para que
   cualquiera en la cadena pueda confirmar lo que trae en las manos.

---

## Parte 4 · La tarima (coordinador)

En **Tarimas**. Un voluntario no arma tarimas.

1. Crear la tarima. Nace abierta y con su propio código y QR.
2. Agregar cajas **selladas**, una por una, escaneando o tecleando su código. Una
   caja rechazada o todavía en borrador no entra. Una caja que ya está en otra
   tarima, tampoco.
3. Cerrar la tarima. Aquí se captura el **peso bruto en báscula** y la altura.

Sobre el peso vale la pena entender algo, porque a primera vista parece un error:

- El peso de referencia del catálogo es solo el contenido, y sirve para cachar un
  dedazo. No es el peso de la caja llena, que además lleva cartón y relleno.
- El peso de la tarima incluye la base y el emplaye, así que **tampoco es la suma
  de sus cajas**. Es el peso que valida la línea aérea y el que viaja a los
  documentos.

El sistema muestra la diferencia entre niveles y nunca bloquea por ella. Pesar dos
veces es factible en un centro; pesar producto por producto, no.

Si la báscula está descompuesta, la tarima se cierra igual. Una báscula rota no
puede detener una tarima que ya está armada.

---

## Parte 5 · El envío y sus documentos (coordinador)

En **Envíos**.

1. Crear el envío: destino, transportista, referencia y, si aplica, el perfil de
   altura de la aeronave o el contenedor.
2. Agregar tarimas **cerradas**. Si alguna excede la altura declarada, el sistema
   avisa, pero no bloquea: quien está en el andén ve la tarima y el sistema no.
3. Cerrar el envío (no se puede cerrar vacío).
4. **Despachar.** Este es el punto de no retorno: al despachar se congela todo,
   tarimas y cajas incluidas. Ya no se edita nada, **y sigue así después**:
   entregarlo y reconciliarlo tampoco vuelven a tocar las cajas (ver la Parte 6).
5. Descargar los documentos:
   - **Manifiesto** (PDF y Excel): el packing list, caja por caja.
   - **Declaración de mercancías** (Excel y JSON): lo que hay, cuánto pesa,
     cuántos bultos, de dónde a dónde, más la razón social y la identificación
     fiscal del centro, impresas tal cual se capturaron.

Sobre la declaración conviene ser claro: Araguaney es un software, no una
fundación ni un asesor fiscal. Documenta lo que hay en las cajas con precisión;
cualquier regla tributaria o aduanal del país de turno la resuelve el despachante
o el contador del centro.

---

## Parte 6 · El viaje y lo que llegó

Despachar no es el final. Un envío sigue vivo hasta que alguien registra qué
llegó de verdad.

### Los hitos del camino

En la ficha del envío se pueden ir anotando los sucesos del viaje: salió del
almacén, llegó al aeropuerto, quedó retenido en aduana, salió a reparto. Son
**hitos**: dejan constancia de que algo pasó sin inventar estados intermedios.
Por eso la máquina de estados no crece con cada aeropuerto ni con cada trámite.

La fecha la pone quien registra el hito, no el sistema. El reporte del
consignatario suele llegar tarde y describir algo de ayer; el campo de fecha
existe para que el hito quede cuando ocurrió y no cuando alguien se enteró.

### Registrar la recepción en destino

Cuando el envío llega, se marca **entregado** y se captura, caja por caja, qué
llegó: bien, faltante, dañado o retenido. Al terminar, el envío queda
**reconciliado**.

Aquí hay una decisión de diseño que conviene entender, porque a primera vista
parece un error:

> **Registrar la recepción no toca el inventario despachado.** Las cajas siguen
> diciendo lo que se envió. Lo que llegó vive aparte.

Enviado y recibido son dos hechos distintos, y el sistema guarda los dos. Si al
recibir se corrigieran las cajas hacia atrás, la diferencia desaparecería, y esa
diferencia es justamente lo que hay que poder medir: la **merma**.

### Incidencias

Lo que salió mal —un faltante, un daño, una retención en aduana, una diferencia
de peso— se abre como incidencia, acotada a la tarima o a la caja cuando se sabe
cuál. Cada una tiene su estado y se cierra con una nota de resolución.

### La merma

Es el espejo del porcentaje de rechazo en la recepción: uno mide lo que no se
aceptó al entrar, la merma mide lo que no llegó al salir. Se calcula **solo
sobre envíos reconciliados**. Un envío que nadie ha recibido todavía no tiene
merma de cero: tiene merma desconocida, que no es lo mismo.

---

## Parte 7 · Movimientos entre centros

En **Transferencias**. Sirve cuando un centro le pasa cajas a otro (porque el
otro tiene el envío armado, o porque hay que consolidar).

Solo se transfieren cajas selladas que todavía no estén en una tarima. El camino
es: se solicita, el coordinador del centro que entrega aprueba o rechaza, luego
despacha, y el coordinador del centro que recibe confirma la recepción. Cada
transferencia tiene su propio manifiesto.

---

## Parte 8 · Ver el resultado

### Reportes de campaña

En **Reportes**, eligiendo campaña y rango de fechas. Muestra cuántas cajas y
unidades entraron, cómo se reparten por estado, la actividad día a día, el
desglose por categoría y por centro, y el mapa de origen y destino. Se puede
exportar a CSV.

Dos cosas que ahorran confusión:

- Por default muestra **los últimos 30 días**. Si la captura fue antes, hay que
  mover el rango o el reporte sale vacío.
- Cuenta por **fecha de recepción**, no por fecha de sellado ni de envío.

### Panel nacional

En **Inicio** para la administración nacional: el stock agregado de todos los
centros, por categoría y por centro, más el avance de peso contra la meta de la
campaña.

### Lo que ve el público

Sin cuenta y sin login, cualquiera puede ver:

- **Qué falta** (`/necesidades`): stock disponible por categoría, sin nombres de
  centro ni datos de nadie.
- **La ficha de un QR**: qué hay en esa caja o en esa tarima.
- **La página de una campaña**, cuando tiene una liga pública.

### Auditoría

En **Auditoría**. Cada cambio de estado quedó registrado: quién, cuándo, de qué
estado a cuál. No es un extra: es lo que sostiene la trazabilidad completa, desde
el donante hasta el envío.

---

## El camino completo, en una línea

Centros y catálogo listos → campaña abierta con su gente inscrita → el donante
registra en línea (o no) → recepción, que crea las cajas (con o sin conexión) →
sellado y etiqueta → tarima cerrada y pesada → envío despachado con manifiesto →
hitos del viaje → recepción en destino y reconciliación → reporte y merma.
