"""Structured output schemas used by the workflow nodes."""

from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class RouteDecision(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    next: Literal["semantic_ocr", "analytics_recommendation", "finish"] = Field(
        validation_alias=AliasChoices("next_agent", "next", "destination", "route", "target", "goto", "agent"),
        description="The next action/agent to execute in the graph based on the Supervisor's decision. Allowed values: 'semantic_ocr', 'analytics_recommendation', 'finish'"
    )
    reason: str = Field(default="No reason provided.", description="Short explanation for the routing choice.")


class ValidationResult(BaseModel):
    is_valid: bool = Field(description="Whether the extracted data is valid.")
    extracted_json: str = Field(description="The extracted data formatted as JSON.")
    error_message: str = Field(description="Description of anomalies or errors, empty if valid.")
