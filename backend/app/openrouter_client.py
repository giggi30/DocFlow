"""OpenRouter-backed chat model factory."""

from __future__ import annotations

from functools import lru_cache

from langchain_openai import ChatOpenAI

from .config import get_config
from .models_registry import MODEL_REGISTRY


@lru_cache(maxsize=None)
def get_chat_model(role: str, temperature: float = 0.2, max_retries: int = 2) -> ChatOpenAI:
    model_name = MODEL_REGISTRY.get(role)
    if not model_name:
        raise KeyError(f"Unknown role '{role}'. Available roles: {', '.join(sorted(MODEL_REGISTRY))}")

    settings = get_config()
    # Keep an explicit Authorization header as a safety net for runtime/client
    # combinations where api_key propagation can fail.
    default_headers = {"Authorization": f"Bearer {settings.openrouter_api_key}"}
    return ChatOpenAI(
        model=model_name,
        openai_api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=temperature,
        max_retries=max_retries,
        default_headers=default_headers,
    )