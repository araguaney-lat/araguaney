# Comprobar los avisos push antes de que exista la aplicación

"Probar el push" son tres cosas distintas, y solo la última necesita un teléfono.
Separarlas evita dos errores caros: creer que está verificado cuando no lo está,
y esperar a tener la aplicación para descubrir que la credencial estaba mal
puesta desde el principio.

| Capa | Qué demuestra | Necesita la app |
|---|---|---|
| Pruebas automáticas | Que la lógica alrededor del envío es correcta: a quién se avisa, qué pasa con un token muerto, qué pasa sin red | No |
| Comprobación de credencial | Que la llave sirve, que Google la acepta y que FCM procesa nuestras peticiones | No |
| Entrega real | Que un aviso aparece en la pantalla de alguien | Sí |

## La comprobación de credencial

Se ejecuta **dentro de los servicios desplegados**, donde ya están el código y
sus dependencias. Hay que correrlo en los **dos**:

```
railway ssh --service "<servicio-backend>"
python -m scripts.check_push_credential
```

```
railway ssh --service "<servicio-worker>"
python -m scripts.check_push_credential
```

El del worker es el que de verdad importa, y es fácil olvidarlo. El despacho va
encolado en ARQ, así que **quien habla con FCM es el worker, no el backend**. Si
la credencial estuviera bien en uno y mal en el otro —un pegado incompleto, una
variable que se puso en un solo servicio— la comprobación saldría verde y los
avisos seguirían sin llegar, sin más rastro que un error tragado por el
despachador.

Que ambos servicios *tengan* la variable no basta para saber que las dos son
válidas; eso solo lo dice ejecutar la comprobación en cada uno.

Conviene no confundirlo con `railway run`, que ejecuta el comando **en tu
máquina** con las variables del servicio inyectadas. Sirve para otras cosas,
pero aquí no: el script importa la configuración de la aplicación y pediría
tener instaladas todas las dependencias del backend en local.

Manda una petición a FCM con un token deliberadamente inválido, así que **no
llega ningún aviso a nadie**. Lo que se lee es el error, porque distingue los dos
fallos que importan:

- **La credencial no sirve** (o le falta el rol de mensajería): el intercambio
  OAuth2 falla antes de llegar a FCM, con un 401 o un 403.
- **La credencial sirve**: FCM responde que ese token no existe. Es un éxito
  disfrazado de error: significa que el JWT se firmó, que Google lo aceptó y que
  FCM procesó la petición.

Sirve igual para verificar una rotación de llave. Si la nueva no quedó bien
puesta, esto lo dice en segundos, en vez de descubrirlo el día que un aviso no
llegue.

## Qué queda sin verificar

La última capa, y no hay forma de adelantarla: que el token que registra un
dispositivo real sea aceptado y que el aviso aparezca en pantalla. Eso ocurre
cuando la aplicación registre su primer token contra `POST /v1/devices`.

Hasta entonces, `PUSH_ENABLED` puede quedarse en `false` sin costo: los eventos
del dominio se disparan igual, el despachador devuelve de inmediato y no sale
nada.

## El orden recomendado al encender

1. Correr la comprobación de credencial **en el backend y en el worker**. Si
   falla en cualquiera de los dos, nada de lo demás tiene sentido.
2. Poner `PUSH_ENABLED=true`.
3. Registrar un dispositivo de verdad desde la aplicación.
4. Provocar uno de los dos hechos que avisan (una revisión de riesgo o un envío
   marcado como entregado) y confirmar que el aviso llega.

El paso 4 conviene hacerlo con una captura de prueba en un centro de prueba, no
esperando a que ocurra sola en operación.
