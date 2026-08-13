# Flujo de trabajo, de punta a punta

Dos lecturas del mismo camino, según para quién, más el runbook de una decisión
que se toma desde fuera de la aplicación.

| Documento | Para quién | Qué trae |
|---|---|---|
| [recorrido-operativo.md](./recorrido-operativo.md) | Quien opera un centro, coordinación, presentaciones | La narración del flujo completo, sin detalle técnico |
| [pruebas-end-to-end.md](./pruebas-end-to-end.md) | QA y desarrollo | Guion de prueba con roles, endpoints, estados, casos negativos y problemas conocidos. Va desde crear el centro hasta reconciliar el envío en destino, e incluye la revisión visual de los documentos generados |
| [version-minima-del-cliente.md](./version-minima-del-cliente.md) | Quien publica versiones de la aplicación móvil | Cuándo subir `MIN_SUPPORTED_CLIENT_VERSION` y qué le cuesta a un centro que se suba |
| [avisos-push.md](./avisos-push.md) | Quien opera la infraestructura | Cómo comprobar la credencial de FCM sin una app instalada, y qué queda sin verificar hasta que exista |

Los manuales por sección viven dentro de la aplicación, en **Ayuda**
(`/dashboard/ayuda`). Estos dos documentos son el hilo que los une.
