# Fase 28 — Otro nombre para el mismo producto

> Quien dona escribe como habla, y no habla como el catálogo. La medición del
> mapeo de texto del 2026-09-04 dio 87% y dejó tres fallos que **ninguna mejora
> de búsqueda alcanza**: `frazadas`, `acetaminofén` y `advil` no comparten una
> letra con la entrada del catálogo a la que corresponden. No es un problema de
> búsqueda — es que al producto le falta el nombre por el que esa persona lo
> pidió.
>
> **Costo:** una tabla, una migración y una lista sembrada. Sin servicios nuevos
> y sin llamadas de IA adicionales: el alias actúa antes del modelo, en la
> recuperación de candidatos.

---

## Los tres fallos no son el mismo problema

| Texto | Producto | Qué es en realidad | Quién lo resuelve |
|---|---|---|---|
| `acetaminofén` | Paracetamol | La misma molécula con dos nomenclaturas oficiales (USAN e INN), y cuál se usa depende del país | A mediano plazo RxNorm y la lista ATC, que ya las publican; hoy, cuatro filas a mano |
| `advil` | Ibuprofeno | Marca comercial → sustancia | `ProductType.brand`, que ya existía |
| `frazadas` | Cobija de lana | Sinónimo regional de un no-alimento | La lista sembrada: es un hecho del idioma |

Solo el tercero es genuinamente un diccionario escrito a mano, y de esos hay
decenas. El segundo es una carrera que se pierde sola si se cura a mano: las
marcas son miles, cambian por país y salen del laboratorio, no del idioma.

## Hay dos consumidores del catálogo, no uno

`text_mapping._shortlist` arma los candidatos que ve la IA.
`ProductTypeRepository.search` responde al buscador que usan el formulario del
panel y la aplicación móvil.

Si los alias alimentaran solo a la IA, teclear "frazadas" encontraría el
producto por un camino y no por el otro. Dos nociones distintas de qué
corresponde al mismo producto, y la incoherencia la sufre quien captura sin que
nadie pueda explicársela. **Los dos consumidores usan la misma regla**, que por
eso bajó a `app/utils/text_matching.py`: un repositorio no puede importar de un
servicio sin invertir las capas.

## Por qué el alias se guarda dos veces

`alias` tal como se escribió, para mostrarlo y editarlo; `normalized` en
minúsculas y sin acentos, que es lo que se compara. Sin la segunda columna el
buscador tendría que normalizar en SQL con `unaccent`, que es una extensión de
Postgres que SQLite no tiene — y como las pruebas corren en SQLite, dejarían de
vigilar la consulta que corre en producción. Es la trampa del dialecto que el
`CLAUDE.md` documenta, y aquí muerde.

## Global, nunca por centro

Un alias es un hecho del idioma: "frazada" significa lo mismo en Monterrey que
en Caracas. Tenerlo por centro fragmentaría el idioma sin ganar nada y obligaría
a cada centro a redescubrir lo que otro ya sabe.

## El precedente que esto copia

`product_type_gtins` ya hace exactamente esto con códigos de barras: tabla
lateral, columna `source`, y `find_by_gtin` consulta lo aprendido antes que el
catálogo. Esta fase aplica el mismo patrón a texto en vez de a números. No es un
diseño nuevo.

---

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Regla de coincidencia compartida | `app/utils/text_matching.py` con `normalize`, `words` y `shares_stem`, extraídas de `text_mapping`. Vive en utils porque tiene dos consumidores y un repositorio no puede importar de un servicio. | 🟢 Baja | ✅ Done |
| 2 | Tabla `product_aliases` | Migración `047`, reversible. `alias` + `normalized`, `source` con CHECK (`seed`/`manual`/`learned`), único por (producto, normalizado), FK con CASCADE. Verificada contra Postgres real: sube, baja y vuelve a subir. | 🟠 Media | ✅ Done |
| 3 | Lista sembrada | 42 alias de idioma en `app/seeds/aliases.py`, con ids uuid5 deterministas para que re-sembrar no duplique. Referencian su producto por la llave natural del catálogo, no por un id escrito a mano. | 🟠 Media | ✅ Done |
| 4 | Los dos consumidores los usan | El shortlist suma alias y `brand` a las palabras del producto; el buscador agrega un `EXISTS` contra `normalized` y consulta `brand`. Ambos respetan el scoping por campaña. | 🟠 Media | ✅ Done |
| 5 | Cada alias se gana su fila | Prueba que falla si un alias sembrado ya se encontraba sin él. Descartó 11 de los 53 iniciales, que eran ruido. Un alias redundante no rompe nada, pero hace creer que la lista cubre más de lo que cubre. | 🟢 Baja | ✅ Done |
| 6 | Alias aprendidos de la captura | Graduar a alias los pares (texto, producto elegido) de `product_mapping_choices` tras N confirmaciones de personas distintas. Es la respuesta escalable a las marcas: los alias que importan son los que la gente teclea, y la plataforma ya los registra. **Espera volumen a propósito** — hoy la evidencia son 3 fallos entre 30 casos escritos a mano. | 🟠 Media | ⬜ Pendiente |
| 7 | Gestión desde el panel | Ver, agregar y borrar alias en la misma fila desplegable del catálogo donde ya viven los códigos de barras: son dos formas de decir cómo se encuentra un producto, y separarlas obligaría a buscarlo dos veces. Tres rutas nuevas bajo `/v1/product-types/{id}/aliases`, solo administración nacional, con auditoría. Agregar rechaza un alias que el catálogo ya encontraba —la misma regla que vigila a los sembrados, en la frontera— y borrar alcanza también a los sembrados: uno equivocado arrastra al producto equivocado en cada captura. | 🟠 Media | ✅ Done |
| 8 | Volver a medir | Correr `evals/run.py --capability mapping` completo y registrar el número. La recuperación ya se midió (ver abajo); falta la corrida con el modelo, que cuesta dinero y pide la llave. | 🟢 Baja | ⬜ Pendiente |

---

## Lo que se midió, y lo que no se arregló

La recuperación se comprobó sobre el catálogo semilla real con los alias
sembrados, que es donde actúa este cambio: el diagnóstico del 2026-09-04 ya
había establecido que el modelo no era el cuello de botella, la recuperación
sí — casi todos los fallos eran listas de candidatos vacías.

| Texto | Candidatos antes | Después |
|---|---|---|
| `10 frazadas` | 0 | Cobija de lana |
| `acetaminofen 500mg` | 0 | Paracetamol 500mg tableta, entre 16 |
| `advil 400` | 0 | **0** |
| `tapabocas` | 0 | Cubrebocas N95 |
| `caraotas negras` | 0 | Frijol negro |

**`advil` sigue sin encontrarse, y no se arregló a propósito.** El mecanismo
está —el shortlist y el buscador consultan `brand`— pero ninguna semilla escribe
"Advil" en ningún producto. Llenarlo a mano sería elegir qué marcas y de qué
país sin ningún dato, sobre un caso que representa 1 de 30 escritos a mano. La
respuesta diseñada para las marcas es la task 6, y espera volumen a propósito.

Hay además una razón de dominio para no forzarlo: una marca no identifica una
presentación. "Advil" es ibuprofeno, pero el catálogo distingue 400 mg de
800 mg como SKU distintos, así que un alias de marca apuntando a una sola fila
afirmaría una concentración que la marca no dice.

---

## El riesgo de la task 6, dicho antes de construirla

Graduar alias desde lo que la gente teclea es un camino de escritura **desde
texto de usuario hacia lo que el sistema propone**. Alguien podría empujar
"paracetamol" hacia "botas" repitiéndolo. Se acota con dos cosas y no hace falta
más: N confirmaciones de usuarios distintos, y que los alias aprendidos sean
visibles y reversibles desde el panel (task 7, que por eso va antes). El daño
máximo es una sugerencia mala que una persona después confirma o descarta —
nunca inventario, porque nada se sella sin que alguien mire.

## Lo que esta fase no hace

- **No integra RxNorm ni ATC.** Las cuatro equivalencias de nomenclatura están a
  mano; la fuente correcta a mediano plazo son esos catálogos, que el
  `CLAUDE.md` §8 ya lista como gratuitos.
- **No llena `brand` en las semillas.** La columna existía y ahora se consulta,
  pero ninguna semilla la escribe: sirve para productos que un centro cree con
  marca, y para lo que venga de la task 6.
- **No cambia el prompt ni el modelo.** El alias actúa antes, en la
  recuperación: el modelo no puede elegir un producto que nunca vio.
