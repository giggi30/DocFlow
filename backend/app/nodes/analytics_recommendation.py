"""Analytics & Recommendation node using Nemotron 3 Super for long reasoning."""

from __future__ import annotations
from typing import Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import Command

from ..openrouter_client import get_chat_model
from ..prompts import DECISION_PROMPT
from ..state import AgentState


def analytics_recommendation_node(state: AgentState) -> Command[Literal["__end__"]]:
    model = get_chat_model("analytics_recommendation", temperature=0.3)
    
    response = model.invoke([
        SystemMessage(content=DECISION_PROMPT),
        HumanMessage(content=f"Tracking details: {state.get('tracking_info', '')}\nDocs: {state.get('documents_generated', [])}")
    ])
    
    return Command(
        update={
            "kpi_recommendation": response.content,
            "messages": [AIMessage(content=response.content)],
            "trace": ["analytics_recommendation final node complete"]
        },
        goto="__end__"
    )
