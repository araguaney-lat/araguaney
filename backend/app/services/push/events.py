"""Qué hechos del dominio generan un aviso, y a quién.

Vive aparte del despachador porque son preguntas distintas: allá está *cómo* se
entrega, aquí *qué merece interrumpir a alguien*. Y esta segunda es de dominio,
así que cambiarla debería costar una revisión, no una casilla en un panel.

**Solo se avisa de lo que alguien tiene que hacer o decidir.** Un aviso que no
pide nada entrena a la gente a ignorarlos, y cuando eso pasa el canal deja de
servir también para lo que sí importaba. Por eso la lista es corta y crece con
discusión, no por inercia.

El texto va en español y aquí, no en el ARB del cliente: lo compone quien conoce
el hecho, y una aplicación instalada hace meses lo mostraría igual sin tener que
actualizarse para entender un aviso nuevo.
"""

import logging
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


def _notify_center_coordinators(
    db: Session,
    background_tasks: BackgroundTasks | None,
    *,
    center_id: UUID | None,
    title: str,
    body: str,
    data: dict[str, str],
) -> None:
    """Encola un aviso para cada coordinación del centro.

    Nunca lanza. Un aviso es un efecto secundario del hecho, y el hecho ya
    ocurrió: dejar que un fallo aquí tumbe la captura de un intake o el cambio
    de estado de un envío sería invertir cuál de los dos importa.
    """
    if background_tasks is None or center_id is None:
        return
    try:
        for user_id in UserRepository(db).coordinator_ids(center_id):
            enqueue(
                background_tasks,
                "push_notify_user_task",
                str(user_id),
                title,
                body,
                data,
            )
    except Exception:
        logger.exception("No se pudo encolar el aviso push")


def risk_review_opened(
    db: Session,
    background_tasks: BackgroundTasks | None,
    *,
    center_id: UUID | None,
    intake_id: UUID,
) -> None:
    """Una captura levantó una revisión de riesgo.

    Se avisa a la coordinación del centro y **no** a quien capturó. La regla del
    dominio dice que la revisión la resuelve la coordinación, nunca quien la
    originó; avisarle sería invitarlo a intervenir donde no le toca.

    El aviso no dice por qué se levantó. Quien lo recibe abre la revisión y lo
    ve ahí, con el contexto completo, en vez de en una línea de notificación que
    puede leer alguien mirando por encima del hombro.
    """
    _notify_center_coordinators(
        db,
        background_tasks,
        center_id=center_id,
        title="Revisión pendiente",
        body="Una captura de tu centro quedó en revisión. Ábrela para resolverla.",
        data={"kind": "risk_review", "intake_id": str(intake_id)},
    )


def private_message_received(
    db: Session,
    background_tasks: BackgroundTasks | None,
    *,
    thread_id: UUID,
    recipient_ids: list[UUID],
    sender_name: str,
    title: str,
) -> None:
    """Alguien escribió en un hilo privado.

    Solo los hilos privados avisan. Los de campaña son difusión, y hacer vibrar
    a todos sus miembros por cada respuesta es la forma más rápida de que la
    gente apague las notificaciones y deje de ver también las que sí piden algo.
    El correo, que espera en una bandeja en vez de interrumpir, sigue saliendo
    para ambos tipos.

    Quién entra en `recipient_ids` lo decide el repositorio: solo quienes ya
    leyeron lo anterior. A quien tiene el mensaje previo sin abrir ya se le
    avisó por ese.

    El aviso lleva el título del hilo y quién escribe, y **no el cuerpo del
    mensaje**. Se lee en una pantalla de bloqueo, y un mensaje entre operadores
    puede hablar de una donación con nombre y apellido.
    """
    if background_tasks is None or not recipient_ids:
        return
    try:
        for user_id in recipient_ids:
            enqueue(
                background_tasks,
                "push_notify_user_task",
                str(user_id),
                f"Mensaje de {sender_name}",
                title,
                {"kind": "private_message", "thread_id": str(thread_id)},
            )
    except Exception:
        logger.exception("No se pudo encolar el aviso de mensaje privado")


def shipment_delivered(
    db: Session,
    background_tasks: BackgroundTasks | None,
    *,
    center_id: UUID | None,
    shipment_id: UUID,
    reference: str,
) -> None:
    """Un envío llegó a destino.

    Va a la coordinación del centro de origen, que es quien responde por ese
    envío y quien va a registrar la recepción. El voluntariado que armó las
    cajas queda fuera a propósito: la noticia es buena pero no le pide nada, y
    los avisos que no piden nada son los que enseñan a ignorar los que sí.
    """
    _notify_center_coordinators(
        db,
        background_tasks,
        center_id=center_id,
        title="Envío entregado",
        body=f"El envío {reference} llegó a destino. Registra qué llegó.",
        data={"kind": "shipment_delivered", "shipment_id": str(shipment_id)},
    )
