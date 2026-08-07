# Conjunto de referencia de IA (Fase 23, task 8)

Sin medición no hay fase: una sugerencia mala que nadie mide degrada el catálogo
en silencio.

## Qué hay aquí

| Archivo | Capacidad | Casos |
|---|---|---|
| `mapping_cases.json` | Mapeo de texto libre → catálogo | Renglones como los escribe quien dona, con el producto que les corresponde |
| `ocr_cases.json` | OCR de etiqueta de medicamento | Referencia de la imagen y los campos que deberían leerse |

## Los umbrales están fijados de antemano

Viven en `app/services/ai/evaluation.py`, y se fijaron **al construir el
conjunto, antes de medir nada**. Un umbral elegido después de ver los resultados
no es un umbral, es una justificación.

Si una capacidad no los supera, no se enciende: se cambia de modelo, se mejora el
prompt, o se queda apagada.

## Cómo se corre

```bash
# Contra el proveedor configurado (mide calidad y costo reales)
python -m evals.run --capability mapping

# En CI corre contra un proveedor simulado: la suite no debe depender de que un
# tercero tenga un buen día.
pytest tests/test_ai_evaluation.py
```

## Estado del conjunto

La spec pide ~100 casos por capacidad **con datos reales del escenario
sembrado**. Hoy hay una primera tanda escrita a partir del dominio (los productos
del catálogo semilla y las formas en que la gente nombra lo que dona), suficiente
para que el arnés y los umbrales existan y corran en CI.

Completarlo exige capturas reales: renglones que hayan escrito donantes de verdad
y fotos de cajas que hayan pasado por un centro. **Ninguna capacidad se enciende
en producción hasta que su conjunto llegue a ese tamaño**, porque un conjunto
pequeño mide poco y da confianza de más.
