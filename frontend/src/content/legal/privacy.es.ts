import type { LegalDoc } from "./types"

// Aviso de Privacidad — marco LFPDPPP (México), arts. 15–16 y su Reglamento.
// Primera versión. No constituye asesoría legal; debe revisarse por un
// profesional antes de habilitar donaciones de dinero (Fase 13, Grupo B).

export const privacyEs: LegalDoc = {
  title: "Aviso de Privacidad",
  version: "1.0",
  updatedISO: "2026-07-02",
  updatedLabel: "2 de julio de 2026",
  versionLabel: "Versión",
  updatedPrefix: "Última actualización:",
  intro:
    "Este Aviso de Privacidad describe qué datos personales tratamos de las personas que operan la plataforma Araguaney (coordinadores, voluntarios y administradores), con qué fines y cómo puedes ejercer tus derechos. Araguaney está diseñada para NO recabar datos personales de donantes ni de beneficiarios finales: solo tratamos los datos mínimos de las personas usuarias que operan el sistema.",
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
            "No recabamos datos personales de donantes ni de beneficiarios finales. La plataforma solo gestiona inventario de donaciones en especie. El campo de donante es texto libre y opcional, sin información personal identificable.",
        },
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
            ],
          },
        },
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
