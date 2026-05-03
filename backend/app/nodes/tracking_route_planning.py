"""Tracking & Route Planning node using qwen/qwen3.6-plus."""

from __future__ import annotations
from typing import Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import Command

from ..openrouter_client import get_chat_model
from ..prompts import LOGISTICS_PROMPT
from ..state import AgentState


def tracking_route_planning_node(state: AgentState) -> Command[Literal["analytics_recommendation"]]:
    model = get_chat_model("tracking_route_planning", temperature=0.2)
    
    response = model.invoke([
        SystemMessage(content=LOGISTICS_PROMPT),
        HumanMessage(content=f"Plan route for extracted info: {state.get('extracted_data', '')}")
    ])
    
    return Command(
        update={
            "tracking_info": response.content,
            "messages": [AIMessage(content=response.content)],
            "trace": ["tracking_route_planning node complete"]
        },
        goto="analytics_recommendation"
    )
