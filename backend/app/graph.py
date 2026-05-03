"""LangGraph workflow wiring for the DOCFLOW multi-agent flow."""

from __future__ import annotations

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from .nodes.supervisor import supervisor_node
from .nodes.semantic_ocr import semantic_ocr_node
from .nodes.rpa_document_generation import rpa_document_generation_node
from .nodes.tracking_route_planning import tracking_route_planning_node
from .nodes.analytics_recommendation import analytics_recommendation_node
from .state import AgentState

builder = StateGraph(AgentState)

builder.add_node("supervisor", supervisor_node)
builder.add_node("semantic_ocr", semantic_ocr_node)
builder.add_node("rpa_document_generation", rpa_document_generation_node)
builder.add_node("tracking_route_planning", tracking_route_planning_node)
builder.add_node("analytics_recommendation", analytics_recommendation_node)

builder.add_edge(START, "supervisor")
# Supervisor will return Command to goto semantic_ocr or analytics_recommendation or __end__
# semantic_ocr will return Command to goto rpa_document_generation or __end__
# rpa_document_generation will return Command to goto tracking_route_planning
# tracking_route_planning will return Command to goto analytics_recommendation
# analytics_recommendation will return Command to goto __end__

workflow = builder.compile(checkpointer=MemorySaver())
