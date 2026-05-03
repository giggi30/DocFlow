"""Runtime configuration for the DOCFLOW LangGraph app."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class AppConfig:
	openrouter_api_key: str
	openrouter_base_url: str
	app_env: str
	default_thread_id: str


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
	api_key = os.getenv("OPENROUTER_API_KEY")
	if not api_key:
		raise RuntimeError("OPENROUTER_API_KEY is required")

	return AppConfig(
		openrouter_api_key=api_key,
		openrouter_base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
		app_env=os.getenv("APP_ENV", "dev"),
		default_thread_id=os.getenv("LANGGRAPH_THREAD_ID", "docflow-dev"),
	)
