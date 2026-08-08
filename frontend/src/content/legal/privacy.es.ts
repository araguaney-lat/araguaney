import type { LegalDoc } from "./types"

// Aviso de Privacidad — marco LFPDPPP (México), arts. 15–16 y su Reglamento.
// Primera versión. No constituye asesoría legal; debe revisarse por un
// profesional antes de habilitar donaciones de dinero (Fase 13, Grupo B).

export const privacyEs: LegalDoc = {
  title: "Aviso de Privacidad",
  version: "1.3",
  updatedISO: "2026-08-07",
  updatedLabel: "7 de agosto de 2026",
  versionLabel: "Versión",
  updatedPrefix: "Última actualización:",
  intro:
    "Este Aviso de Privacidad describe qué datos personales tratamos, con qué fines y cómo puedes ejercer tus derechos. Tratamos datos de dos grupos: las personas que operan la plataforma (coordinadores, voluntarios y administradores) y, cuando así lo deciden, las personas donantes que piden quedar registradas. Araguaney sigue sin recabar datos de beneficiarios finales, y la donación anónima sigue siendo la norma: registrar al donante es siempre opcional.",
  sections: [
    {
      heading: "Responsable del tratamiento",
      blocks: [
        "El responsable del tratamiento de tus datos personales es el proyecto Araguaney (\"Araguaney\", \"la plataforma\", \"nosotros\"), una iniciativa sin fines de lucro para la coordinación de centros de acopio de ayuda humanitaria.",
        "A la fecha de este aviso no existe una entidad jurídica asociada al proyecto: el responsable del tratamiento es Antony Delgado Casanova, titular del proyecto, quien atiende personalmente las solicitudes de privacidad a través del correo indicado abajo y en la sección de Derechos ARCO. Si en el futuro se constituye una entidad jurídica, este aviso se actualizará con su razón social y domicilio fiscal.",
        "Para cualquier asunto relacionado con tus datos personales o este aviso, contáctanos en: privacidad@araguaney.lat",
      ],
    },
    {
      heading: "Datos personales que recabamos",
      blocks: [
        "Solo recabamos los datos necesarios para dar de alta y operar tu cuenta dentro de un centro de acopio. Estos son:",
        {
          table: {
            head: ["Dato", "Para qué"],
            rows: [
              ["Nombre y nombre de usuario", "Identificarte dentro de la plataforma y en los registros de actividad."],
              ["Correo electrónico", "Autenticación, invitaciones y comunicaciones operativas (p. ej. restablecimiento de contraseña)."],
              ["Contraseña", "Se almacena únicamente cifrada (hash); nunca en texto claro y nunca la conocemos."],
              ["Fotografía de perfil (opcional)", "Solo si decides subirla; se muestra en tu perfil y en el menú de la aplicación."],
              ["Dirección IP", "Seguridad, prevención de abuso, límites de tasa (rate limiting) y registros de auditoría."],
              ["Registros de actividad", "Acciones que realizas en la plataforma (crear/sellar cajas, cerrar tarimas, envíos, etc.), con fecha, hora y usuario, con fines de trazabilidad y auditoría."],
              ["Rol, centro y campañas", "Determinar qué puedes ver y hacer dentro de la plataforma (control de acceso)."],
            ],
          },
        },
        {
          emphasis:
            "No recabamos datos personales de beneficiarios finales. La plataforma gestiona inventario de donaciones en especie.",
        },
        "Datos de personas donantes. La donación es anónima por defecto y así se queda salvo que la persona pida ser registrada. Cuando lo pide, el centro captura únicamente:",
        {
          table: {
            head: ["Tipo de donante", "Datos", "Obligatorios"],
            rows: [
              ["Persona física", "Nombre y apellido; correo electrónico y teléfono si desea proporcionarlos", "Solo nombre y apellido"],
              ["Persona moral", "Razón social, nombre y apellido de quien entrega la donación, correo electrónico y teléfono", "Todos"],
            ],
          },
        },
        "Estos datos son de control interno del centro que los captura: no aparecen en ninguna página pública, ni en las fichas de caja o tarima accesibles por código QR, ni se comparten con otros centros de acopio.",
        "Personas que registran su donación en línea. Si usas el formulario público para registrar lo que vas a donar antes de llevarlo a un centro, recabamos:",
        {
          table: {
            head: ["Dato", "Para qué", "Obligatorio"],
            rows: [
              ["Nombre y apellido", "Que el centro sepa quién llega con la donación.", "Sí"],
              ["Correo electrónico", "Confirmar que el registro es tuyo, enviarte tu código QR y el enlace para modificar o cancelar tu donación.", "Sí"],
              ["Teléfono", "Solo por si el centro necesita contactarte.", "No"],
              ["Descripción de lo que vas a donar", "Que el centro pueda prepararse y verificar lo que traes sin capturarlo de nuevo.", "Sí"],
              ["Centro y campaña que eliges", "Orientar tu donación. No te compromete: puedes llevarla a cualquier otro centro.", "No"],
              ["Fotos de lo que vas a donar", "Que el centro sepa qué esperar. Solo las ve el centro que recibe tu donación; nunca se publican ni aparecen en la ficha del código QR.", "No"],
            ],
          },
        },
        "Tu registro no existe para nadie hasta que confirmas tu correo. Si no lo confirmas, se elimina (ver \"Plazos de conservación\"). La ficha pública que abre tu código QR muestra el estado y qué contiene tu donación, nunca tu nombre, tu correo ni tu teléfono. Cuando entregas la donación, tus datos quedan visibles para el centro que la recibe.",
      ],
    },
    {
      heading: "Finalidades del tratamiento",
      blocks: [
        "Tratamos tus datos personales para las siguientes finalidades primarias, necesarias para prestarte el servicio:",
        {
          list: [
            "Crear y administrar tu cuenta de persona usuaria.",
            "Autenticarte y controlar tu acceso según tu rol y centro.",
            "Permitir la operación de la plataforma: registro de donaciones, sellado de cajas, tarimas, envíos y manifiestos.",
            "Permitir que registres tu donación en línea antes de llevarla: confirmar tu correo, emitir tu código QR y darte el enlace para modificarla o cancelarla.",
            "Garantizar la seguridad de la plataforma: prevención de fraude y abuso, límites de tasa y detección de accesos indebidos.",
            "Mantener registros de auditoría y trazabilidad de las operaciones.",
            "Enviarte comunicaciones operativas y de servicio (invitación, restablecimiento de contraseña, notificaciones del sistema).",
          ],
        },
        "No utilizamos tus datos con fines de mercadotecnia ni los vendemos a terceros.",
      ],
    },
    {
      heading: "Tratamiento de IP y registros de auditoría",
      blocks: [
        "Por tratarse de una plataforma que coordina ayuda humanitaria en un contexto sensible, aplicamos medidas de seguridad reforzadas. En particular, registramos tu dirección IP y las acciones que realizas, asociadas a tu usuario, fecha y hora.",
        "Estos registros se utilizan exclusivamente con fines de seguridad, prevención de abuso y auditoría. No se emplean para elaborar perfiles comerciales.",
        "Los registros de auditoría y de eventos se conservan mientras sean necesarios para garantizar la trazabilidad y la seguridad de las operaciones de la plataforma. Cuando solicites la cancelación de tu cuenta, eliminaremos o anonimizaremos tus datos personales salvo aquellos que debamos conservar por razones legales o de seguridad, por el tiempo estrictamente necesario.",
      ],
    },
    {
      heading: "Transferencias y encargados",
      blocks: [
        "Para operar la plataforma nos apoyamos en proveedores tecnológicos que actúan como encargados del tratamiento por cuenta de Araguaney. Estos proveedores procesan datos únicamente para prestarnos su servicio y bajo obligaciones de confidencialidad. Algunos están ubicados fuera de México (principalmente en Estados Unidos):",
        {
          table: {
            head: ["Proveedor", "Servicio", "Datos que procesa"],
            rows: [
              ["Vercel", "Alojamiento del sitio web (frontend)", "Dirección IP, registros de acceso"],
              ["Railway", "Alojamiento del backend y de la base de datos", "Todos los datos de cuenta y operación"],
              ["Cloudflare", "Red de distribución, seguridad (WAF/DNS), verificación anti-abuso (Turnstile) y almacenamiento de archivos (R2)", "Dirección IP, tráfico, exportes y archivos adjuntos de mensajes"],
              ["Resend", "Envío de correos transaccionales", "Correo electrónico y nombre"],
              ["Cloudinary", "Almacenamiento de fotografías de perfil (solo si subes una)", "Imagen de perfil"],
              ["Google (opcional)", "Inicio de sesión (OAuth) y analítica solo en páginas públicas de difusión — nunca dentro del panel", "Datos de autenticación / métricas anónimas de navegación pública"],
              ["Sentry (opcional)", "Registro de errores para diagnóstico técnico", "Contexto técnico del error, posible dirección IP"],
              ["Proveedor de IA — OpenAI (Estados Unidos)", "Asistencia en la captura y coordinación: interpretar el texto de una donación, leer los datos impresos en una etiqueta de medicamento y emparejar una solicitud con el stock disponible", "El texto del renglón de donación, la fotografía de la etiqueta o el texto de una solicitud"],
            ],
          },
        },
        "La asistencia por inteligencia artificial está apagada de forma predeterminada y se activa por decisión de quien opera la plataforma. Cuando está activa, el texto de un renglón de donación, la fotografía de una etiqueta o el texto de una solicitud se envían a un proveedor externo para interpretarlos. Ese envío ocurre únicamente desde el panel, con sesión iniciada, y nunca desde una página pública: lo que escribes al pre-registrar una donación se guarda tal cual y no se envía a ningún proveedor de IA.",
        "Una fotografía de etiqueta puede contener datos personales de forma incidental (por ejemplo, si aparece una receta o un nombre en el encuadre). Te pedimos encuadrar solo la caja del producto. El proveedor procesa la imagen para responder y no la utiliza para entrenar sus modelos; el resultado se conserva en caché por un plazo breve y se elimina junto con la donación conforme a los plazos de esta sección.",
        "En este despliegue el proveedor es OpenAI (OpenAI, L.L.C., Estados Unidos), que procesa los datos para responder y, conforme a sus condiciones para la API, no los utiliza para entrenar sus modelos. Otros despliegues del software pueden configurar un proveedor distinto o un modelo local sin transferencia; si tienes dudas sobre el proveedor vigente puedes escribir al correo de contacto de este aviso.",
        "El resumen nacional asistido por IA se genera únicamente a partir de cifras agregadas (totales por categoría, centro o campaña) y no incluye datos personales.",
        "Las consultas a catálogos de referencia (OMS, UNSPSC, IFRC/ICRC, IOM, GS1, COFEPRIS, RxNorm, Open Food Facts) se realizan únicamente con datos de producto (p. ej. un código de barras) y no incluyen datos personales.",
        "No realizamos transferencias de tus datos personales a terceros distintos de estos encargados, salvo requerimiento de autoridad competente conforme a la ley.",
      ],
    },
    {
      heading: "Cookies y tecnologías de sesión",
      blocks: [
        "Dentro del panel de la aplicación solo usamos cookies estrictamente necesarias para su funcionamiento:",
        {
          list: [
            "Cookie de sesión (autenticación) — mantiene tu sesión iniciada.",
            "Cookie de protección CSRF — previene ataques de falsificación de petición.",
            "Cookie de idioma — recuerda tu preferencia de idioma (español/inglés).",
          ],
        },
        "No utilizamos cookies de rastreo ni de publicidad en el panel autenticado. En las páginas públicas de difusión podemos usar analítica web para medir visitas de forma agregada; esta analítica no se carga dentro del panel ni del studio.",
      ],
    },
    {
      heading: "Plazos de conservación",
      blocks: [
        "Conservamos cada tipo de dato solo mientras es necesario para la finalidad que lo originó. Estos son los plazos vigentes:",
        {
          table: {
            head: ["Dato", "Plazo", "Qué ocurre al vencer"],
            rows: [
              ["Datos de tu cuenta (nombre, correo, foto)", "Mientras la cuenta exista", "Se eliminan cuando eliminas tu cuenta o cuando tu centro la da de baja"],
              ["Registros de auditoría (IP, acción, fecha)", "90 días", "Se borran de forma automática cada noche"],
              ["Adjuntos de mensajería", "90 días", "El archivo se elimina del almacenamiento automáticamente"],
              ["Archivos de exportación (manifiestos, reportes)", "1 hora", "Se eliminan tras la descarga; 24 horas si la generación falló"],
              ["Registros de fallos de envío de correo", "90 días", "Se borran de forma automática"],
              ["Datos de personas donantes registradas (nombre, razón social, correo, teléfono)", "Mientras el centro los conserve", "Se eliminan a solicitud de la persona donante o cuando el centro los da de baja"],
              ["Donación pre-registrada en línea que nunca confirmaste por correo", "7 días desde el último correo de confirmación que te enviamos", "La donación vence y tus datos de contacto se eliminan, salvo que tengas otra donación pendiente o ya entregada"],
              ["Fotos que subes a tu donación", "Lo que dure la donación", "Se eliminan del almacenamiento cuando las quitas, cuando cancelas tu donación o cuando tu registro vence sin confirmar"],
              ["Enlace para gestionar tu donación pre-registrada", "30 días", "El enlace deja de funcionar y se elimina de nuestra base; también se elimina en cuanto entregas la donación"],
              ["Eventos de inventario (quién selló una caja, cerró una tarima o despachó un envío)", "Indefinido", "No se eliminan: sostienen la trazabilidad de la ayuda enviada"],
            ],
          },
        },
        "Los eventos de inventario merecen una aclaración. Son la razón de ser de la plataforma: permiten saber qué contenía cada caja y quién la preparó, que es lo que un envío humanitario debe poder demostrar ante la autoridad aduanera. Por eso no se borran. Cuando eliminas tu cuenta, esos eventos se conservan pero dejan de identificarte: tu nombre y tu correo desaparecen, y solo queda un identificador que ya no permite reconocerte.",
        "El pre-registro de donaciones también merece una aclaración. Si llenas el formulario público y nunca confirmas tu correo, no tenemos forma de saber que esos datos son tuyos: los dejamos vencer y los eliminamos. Si confirmas y entregas la donación, tus datos quedan ligados a lo que entregaste, porque el centro tiene que poder decir de dónde vino cada caja.",
        "No eliminamos cuentas de forma automática por inactividad. El voluntariado humanitario es intermitente y una persona puede volver meses después, ante una nueva emergencia, y necesitar su acceso. Corresponde a la coordinación de cada centro dar de baja a quienes ya no forman parte de él, y a cada persona eliminar su cuenta cuando lo desee.",
      ],
    },
    {
      heading: "Derechos ARCO y revocación del consentimiento",
      blocks: [
        "Como titular de tus datos personales, tienes derecho a Acceder a ellos, Rectificarlos cuando sean inexactos, Cancelarlos cuando consideres que no se requieren para las finalidades señaladas, y Oponerte a su tratamiento (derechos ARCO). También puedes revocar el consentimiento que nos hayas otorgado.",
        "Puedes ejercer la cancelación por ti misma o por ti mismo, en cualquier momento, desde Configuración en tu panel: la opción \"Eliminar mi cuenta\" borra de forma permanente tu nombre, correo, foto y datos de acceso. El registro de qué cajas sellaste o qué envíos despachaste se conserva sin tu nombre, porque la trazabilidad del inventario no puede romperse; queda como un identificador que ya no permite reconocerte.",
        "Para ejercer cualquiera de estos derechos, o si prefieres que lo hagamos por ti, envía tu solicitud al correo:",
        {
          emphasis:
            "privacidad@araguaney.lat — Incluye tu nombre, el correo asociado a tu cuenta y una descripción clara de tu solicitud. Responderemos en un plazo máximo de 20 días hábiles.",
        },
        "Algunos datos —como ciertos registros de auditoría— pueden conservarse por razones legales o de seguridad aun después de una solicitud de cancelación, por el tiempo estrictamente necesario. Te informaremos si ese es el caso.",
      ],
    },
    {
      heading: "Seguridad de la información",
      blocks: [
        "Aplicamos medidas de seguridad administrativas, técnicas y físicas razonables para proteger tus datos: cifrado en tránsito, almacenamiento cifrado de contraseñas, control de acceso por rol, límites de tasa, verificación anti-abuso y registros de auditoría. Ningún sistema es infalible; en caso de una vulneración que afecte de forma significativa tus datos, te lo notificaremos conforme a la ley.",
      ],
    },
    {
      heading: "Cambios a este aviso",
      blocks: [
        "Podemos actualizar este Aviso de Privacidad para reflejar cambios en la plataforma, en nuestros proveedores o en la normativa aplicable. Cada versión lleva un número y una fecha de última actualización visibles al inicio de este documento.",
        "Cuando el cambio sea sustancial, te lo notificaremos por los medios disponibles (p. ej. al iniciar sesión o por correo) y, cuando corresponda, te solicitaremos aceptar nuevamente los términos. La versión vigente siempre estará publicada en esta página.",
      ],
    },
  ],
}
