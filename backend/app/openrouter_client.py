"""OpenRouter-backed chat model factory."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Generic, TypeVar

import httpx
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from .config import get_config
from .models_registry import MODEL_REGISTRY


T = TypeVar("T")


def _message_role(message: BaseMessage) -> str:
    if isinstance(message, SystemMessage):
        return "system"
    if isinstance(message, HumanMessage):
        return "user"
    if isinstance(message, AIMessage):
        return "assistant"
    return getattr(message, "type", "user")


def _message_content(message: BaseMessage) -> Any:
    content = getattr(message, "content", "")
    if isinstance(content, (str, list)):
        return content
    return str(content)


def _extract_json_payload(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])

    raise ValueError(f"Unable to parse JSON from model response: {text[:500]}")


@dataclass(frozen=True)
class OpenRouterChatModel:
    model_name: str
    temperature: float = 0.2
    max_retries: int = 2

    def with_structured_output(self, schema: type[T]) -> "OpenRouterStructuredModel[T]":
        return OpenRouterStructuredModel(base_model=self, schema=schema)

    def invoke(self, messages: list[BaseMessage]) -> AIMessage:
        settings = get_config()
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": _message_role(message), "content": _message_content(message)}
                for message in messages
            ],
            "temperature": self.temperature,
        }

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }

        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                with httpx.Client(timeout=90.0) as client:
                    response = client.post(
                        f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
                        headers=headers,
                        json=payload,
                    )

                if response.status_code >= 400:
                    raise RuntimeError(
                        f"OpenRouter request failed with status {response.status_code}: {response.text}"
                    )

                data = response.json()
                choice = (data.get("choices") or [{}])[0]
                message = choice.get("message") or {}
                content = message.get("content") or ""
                additional_kwargs = {
                    key: value
                    for key, value in message.items()
                    if key not in {"role", "content"}
                }
                return AIMessage(content=content, additional_kwargs=additional_kwargs)
            except Exception as exc:
                last_error = exc
                if attempt < self.max_retries:
                    time.sleep(1.5 * attempt)

        raise RuntimeError(
            f"OpenRouter invocation failed after {self.max_retries} attempts. Last error: {last_error}"
        )


@dataclass(frozen=True)
class OpenRouterStructuredModel(Generic[T]):
    base_model: OpenRouterChatModel
    schema: type[T]

    def invoke(self, messages: list[BaseMessage]) -> T:
        prompt_messages = [
            SystemMessage(
                content=(
                    "Return only valid JSON that matches the requested schema. "
                    "Do not include markdown fences or extra text."
                )
            ),
            *messages,
        ]
        response = self.base_model.invoke(prompt_messages)
        payload = _extract_json_payload(response.content or "")

        schema = self.schema
        if hasattr(schema, "model_validate"):
            return schema.model_validate(payload)
        return schema(**payload)


@lru_cache(maxsize=None)
def get_chat_model(role: str, temperature: float = 0.2, max_retries: int = 2) -> OpenRouterChatModel:
    model_name = MODEL_REGISTRY.get(role)
    if not model_name:
        raise KeyError(f"Unknown role '{role}'. Available roles: {', '.join(sorted(MODEL_REGISTRY))}")

    return OpenRouterChatModel(
        model_name=model_name,
        temperature=temperature,
        max_retries=max_retries,
    )