import type { LegalDoc } from "./types"

// Términos y Condiciones — primera versión. No constituye asesoría legal.
// Cubre: naturaleza del servicio, límite de responsabilidad, conducta,
// propiedad de datos, reglas de rechazo de donaciones, ley aplicable.

export const termsEs: LegalDoc = {
  title: "Términos y Condiciones",
  version: "1.0",
  updatedISO: "2026-07-02",
  updatedLabel: "2 de julio de 2026",
  versionLabel: "Versión",
  updatedPrefix: "Última actualización:",
  intro:
    "Estos Términos y Condiciones regulan el uso de la plataforma Araguaney. Al crear una cuenta o utilizar la plataforma, aceptas estos términos. Si no estás de acuerdo, no debes usar la plataforma.",
  sections: [
    {
      heading: "Qué es Araguaney",
      blocks: [
        "Araguaney es una herramienta de software para coordinar centros de acopio de ayuda humanitaria: permite registrar donaciones en especie por ítem, empacarlas en cajas homogéneas con código QR, consolidarlas en tarimas y envíos, y generar manifiestos, así como visualizar el inventario agregado a nivel nacional.",
        {
          emphasis:
            "Araguaney es una herramienta de coordinación y gestión de inventario. NO transporta, entrega ni distribuye ayuda, y NO garantiza que las donaciones lleguen a un destino o beneficiario determinado. La logística, el transporte y los trámites aduaneros son responsabilidad exclusiva de los centros y organizaciones que operan la ayuda.",
        },
        "El servicio se presta sin fines de lucro, con el objetivo de estandarizar y coordinar la ayuda humanitaria entre México y Venezuela.",
      ],
    },
    {
      heading: "Cuentas y acceso",
      blocks: [
        "El acceso a la plataforma es por invitación. Las cuentas son creadas por administradores o coordinadores de un centro de acopio, y cada cuenta pertenece a una persona identificada mediante su correo electrónico.",
        {
          list: [
            "Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada bajo tu cuenta.",
            "Debes proporcionar información veraz y mantenerla actualizada.",
            "No debes compartir tu cuenta ni permitir su uso por terceros no autorizados.",
            "Debes notificarnos de inmediato cualquier uso no autorizado de tu cuenta.",
          ],
        },
      ],
    },
    {
      heading: "Uso aceptable",
      blocks: [
        "Al usar la plataforma te comprometes a:",
        {
          list: [
            "Utilizarla únicamente para fines legítimos de coordinación de ayuda humanitaria.",
            "Registrar información veraz y precisa sobre las donaciones e inventario.",
            "No introducir datos personales de donantes ni de beneficiarios finales (la plataforma no está diseñada para ello).",
            "No intentar vulnerar la seguridad de la plataforma, acceder a datos de otros centros sin autorización, ni interferir con su funcionamiento.",
            "No usar la plataforma para actividades ilícitas, fraudulentas o que dañen a terceros.",
          ],
        },
        "El incumplimiento de estas reglas puede resultar en la suspensión o cancelación de tu cuenta.",
      ],
    },
    {
      heading: "Reglas de rechazo de donaciones",
      blocks: [
        "Para garantizar la calidad y seguridad de la ayuda, la plataforma aplica reglas basadas en lineamientos internacionales (entre ellos las guías de donación de medicamentos de la OMS). En particular:",
        {
          list: [
            "Los medicamentos deben tener al menos 365 días de vida útil restante al momento de su captura; de lo contrario, se rechazan.",
            "Los alimentos deben cumplir una vida útil mínima configurable (por defecto 180 días).",
            "Las sustancias controladas quedan bloqueadas y no pueden registrarse.",
            "Cada caja debe ser homogénea: un solo tipo de producto, lote y fecha de caducidad.",
          ],
        },
        "Estas validaciones son parte del servicio; los centros son responsables de la exactitud de los datos que capturan y del cumplimiento de la normativa aplicable a las donaciones que gestionan.",
      ],
    },
    {
      heading: "Propiedad y responsabilidad de los datos",
      blocks: [
        "Los datos de inventario que registra cada centro (donaciones, cajas, tarimas, envíos y manifiestos) pertenecen al centro que los captura. Araguaney los aloja y procesa para prestar el servicio y para producir la vista agregada nacional que permite la coordinación entre centros.",
        "Cada centro es responsable de la veracidad, legalidad y exactitud de la información que introduce. La plataforma no verifica de forma independiente el contenido físico real de las donaciones.",
        "Nos reservamos el derecho de usar datos agregados y anonimizados (sin identificar a personas) con fines de coordinación, estadística y mejora del servicio.",
      ],
    },
    {
      heading: "Disponibilidad y límite de responsabilidad",
      blocks: [
        "La plataforma se ofrece \"tal cual\" y \"según disponibilidad\". Nos esforzamos por mantenerla operativa y segura, pero no garantizamos que esté libre de errores o interrupciones.",
        {
          emphasis:
            "En la máxima medida permitida por la ley, Araguaney y las personas que lo operan no serán responsables por daños indirectos, incidentales o consecuenciales derivados del uso o la imposibilidad de uso de la plataforma, incluyendo la pérdida o retraso de donaciones, la falta de entrega de ayuda, o decisiones tomadas con base en la información mostrada. La plataforma es una herramienta de apoyo a la coordinación, no un garante de resultados logísticos ni humanitarios.",
        },
        "Nada en estos términos excluye responsabilidades que no puedan limitarse conforme a la ley aplicable.",
      ],
    },
    {
      heading: "Suspensión y cancelación",
      blocks: [
        "Podemos suspender o cancelar el acceso a una cuenta que incumpla estos términos, que ponga en riesgo la seguridad de la plataforma o de otros usuarios, o cuando lo exija la ley. Tú puedes solicitar la cancelación de tu cuenta en cualquier momento escribiendo a privacidad@araguaney.lat.",
      ],
    },
    {
      heading: "Privacidad",
      blocks: [
        "El tratamiento de tus datos personales se rige por nuestro Aviso de Privacidad, que forma parte integral de estos términos. Te recomendamos leerlo para conocer qué datos tratamos y cómo ejercer tus derechos.",
      ],
    },
    {
      heading: "Cambios a estos términos",
      blocks: [
        "Podemos modificar estos Términos y Condiciones. Cada versión lleva un número y una fecha de última actualización visibles al inicio de este documento. Cuando el cambio sea sustancial, te lo notificaremos y, cuando corresponda, te pediremos aceptar nuevamente los términos para seguir usando la plataforma.",
      ],
    },
    {
      heading: "Ley aplicable y jurisdicción",
      blocks: [
        "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia relacionada con la plataforma se someterá a los tribunales competentes en México, sin perjuicio de los derechos que la ley reconozca a los consumidores o titulares de datos.",
      ],
    },
  ],
}
