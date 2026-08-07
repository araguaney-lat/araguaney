"""Adaptador de proveedor de IA (Fase 23, task 1).

Una interfaz de tres verbos sobre la capa OpenAI-compatible: clasificar texto,
extraer de una imagen y resumir. Nada más, porque nada más necesita la fase.

**Neutral de proveedor a propósito.** OpenAI, DeepSeek, Groq, Together u Ollama
local entran cambiando `AI_BASE_URL`. Un adaptador amarrado a un proveedor
convierte una decisión de costo en una migración de código, y en una operación
humanitaria el costo cambia de la noche a la mañana.

**Apagado por defecto.** Sin `AI_API_KEY` no hay proveedor, y cada verbo lo dice
levantando `AIUnavailable`. Quien llama decide qué hacer con eso; lo que no puede
pasar es que la ausencia de IA rompa una captura.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Protocol

from app.config import settings

logger = logging.getLogger(__name__)


class AIUnavailable(RuntimeError):
    """No hay proveedor configurado, o el de turno falló.

    Es una excepción y no un `None` para que ningún camino la ignore por
    descuido: una sugerencia vacía y una IA caída significan cosas distintas.
    """


@dataclass(frozen=True)
class AIResult:
    """Lo que devuelve una llamada, con lo que hace falta para cobrarla.

    Los tokens viajan con el resultado porque el costo se registra en el mismo
    sitio donde se produce. Calcularlo después, desde un log, es cómo se pierde
    la cuenta.
    """

    data: Any
    input_tokens: int = 0
    output_tokens: int = 0


class AIProvider(Protocol):
    def classify_text(self, prompt: str, text: str, *, max_tokens: int = 400) -> AIResult: ...
    def extract_from_image(self, prompt: str, image_url: str, *, max_tokens: int = 500) -> AIResult: ...
    def summarize(self, prompt: str, data: dict, *, max_tokens: int = 400) -> AIResult: ...


class OpenAICompatibleProvider:
    """Implementación real. Se instancia solo si hay llave configurada."""

    def __init__(self) -> None:
        if not settings.ai_api_key:
            raise AIUnavailable("AI_API_KEY no configurada")
        try:
            from openai import OpenAI
        except ImportError as exc:  # pragma: no cover - depende del entorno
            raise AIUnavailable("El paquete openai no está instalado") from exc

        self._client = OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)
        self._model = settings.ai_model

    def _chat(self, messages: list[dict], max_tokens: int) -> AIResult:
        try:
            respuesta = self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                max_tokens=max_tokens,
                # La temperatura en cero no vuelve determinista al modelo, pero
                # reduce la variación entre dos capturas idénticas, que es lo
                # que haría dudar de la herramienta a quien la usa.
                temperature=0,
                response_format={"type": "json_object"},
            )
        except Exception as exc:
            logger.warning("El proveedor de IA falló: %s", exc)
            raise AIUnavailable(str(exc)) from exc

        contenido = respuesta.choices[0].message.content or "{}"
        uso = getattr(respuesta, "usage", None)
        try:
            data = json.loads(contenido)
        except json.JSONDecodeError as exc:
            # Un modelo que devuelve texto donde se pidió JSON es un modelo que
            # no sirve para esto. Falla ruidoso en vez de adivinar.
            raise AIUnavailable("La respuesta no es JSON válido") from exc

        return AIResult(
            data=data,
            input_tokens=getattr(uso, "prompt_tokens", 0) or 0,
            output_tokens=getattr(uso, "completion_tokens", 0) or 0,
        )

    def classify_text(self, prompt: str, text: str, *, max_tokens: int = 400) -> AIResult:
        return self._chat(
            [{"role": "system", "content": prompt}, {"role": "user", "content": text}],
            max_tokens,
        )

    def extract_from_image(self, prompt: str, image_url: str, *, max_tokens: int = 500) -> AIResult:
        return self._chat(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                ]},
            ],
            max_tokens,
        )

    def summarize(self, prompt: str, data: dict, *, max_tokens: int = 400) -> AIResult:
        return self._chat(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(data, ensure_ascii=False)},
            ],
            max_tokens,
        )


def get_provider() -> AIProvider:
    """Devuelve el proveedor, o levanta `AIUnavailable` si no hay ninguno."""
    return OpenAICompatibleProvider()
