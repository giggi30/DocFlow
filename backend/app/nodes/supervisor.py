"""Supervisor node that routes the workflow."""

from __future__ import annotations
import json
import re
from typing import Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import Command

from ..openrouter_client import get_chat_model
from ..prompts import SUPERVISOR_PROMPT
from ..schemas import RouteDecision
from ..state import AgentState


def _extract_json_payload(text: str) -> dict | None:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def supervisor_node(state: AgentState) -> Command[Literal["semantic_ocr", "analytics_recommendation", "__end__"]]:
    model = get_chat_model("supervisor", temperature=0.0).with_structured_output(RouteDecision)
    messages_to_pass = state.get("messages", [])[-5:]  # Only keep last 5 for context limit

    prompt_messages = [
        SystemMessage(content=SUPERVISOR_PROMPT),
        HumanMessage(content=state.get("task", "Analyze document")),
        *messages_to_pass,
    ]

    try:
        response: RouteDecision = model.invoke(prompt_messages)
        goto_node = response.next
        if goto_node == "finish":
            goto_node = "__end__"

        return Command(
            update={
                "trace": [f"Supervisor decided to route to {goto_node}: {response.reason}"],
                "messages": [AIMessage(content=f"Supervisor route decision: {goto_node}. Reason: {response.reason}")],
            },
            goto=goto_node,
        )
    except Exception as exc:
        raw_model = get_chat_model("supervisor", temperature=0.0)
        raw_response = raw_model.invoke(
            [
                SystemMessage(
                    content=(
                        "Return only JSON with keys 'next' and 'reason'. "
                        "Allowed next values: semantic_ocr, analytics_recommendation, finish."
                    )
                ),
                HumanMessage(content=state.get("task", "Analyze document")),
            ]
        )
        payload = _extract_json_payload(raw_response.content or "")
        if payload:
            try:
                response = RouteDecision(**payload)
                goto_node = response.next
                if goto_node == "finish":
                    goto_node = "__end__"
                return Command(
                    update={
                        "trace": [
                            f"Supervisor recovered from invalid JSON: {exc}",
                            f"Supervisor decided to route to {goto_node}: {response.reason}",
                        ],
                        "messages": [
                            AIMessage(content=f"Supervisor route decision: {goto_node}. Reason: {response.reason}")
                        ],
                    },
                    goto=goto_node,
                )
            except Exception:
                pass

        return Command(
            update={
                "error_detected": True,
                "error_message": f"Supervisor invalid JSON: {exc}",
                "trace": ["Supervisor fallback to semantic_ocr due to invalid JSON."],
                "messages": [AIMessage(content="Supervisor fallback to semantic_ocr due to invalid JSON.")],
            },
            goto="semantic_ocr",
        )
