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
	auth_demo_email: str
	auth_demo_password: str
	auth_demo_token: str
	auth_company_name: str
	auth_demo_email_secondary: str
	auth_demo_password_secondary: str
	auth_demo_token_secondary: str
	auth_company_name_secondary: str


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
		auth_demo_email=os.getenv("DOCFLOW_AUTH_EMAIL", "demo@azienda.it"),
		auth_demo_password=os.getenv("DOCFLOW_AUTH_PASSWORD", "demo123"),
		auth_demo_token=os.getenv("DOCFLOW_AUTH_TOKEN", "demo-token"),
		auth_company_name=os.getenv("DOCFLOW_COMPANY_NAME", "Azienda Demo"),
		auth_demo_email_secondary=os.getenv(
			"DOCFLOW_AUTH_EMAIL_SECONDARY",
			"docflow@unimol.it",
		),
		auth_demo_password_secondary=os.getenv(
			"DOCFLOW_AUTH_PASSWORD_SECONDARY",
			"docflow123",
		),
		auth_demo_token_secondary=os.getenv(
			"DOCFLOW_AUTH_TOKEN_SECONDARY",
			"demo-token-2",
		),
		auth_company_name_secondary=os.getenv(
			"DOCFLOW_COMPANY_NAME_SECONDARY",
			"Unimol",
		),
	)
