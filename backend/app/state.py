"""Shared LangGraph state for the DOCFLOW workflow."""

from __future__ import annotations

import operator
from typing_extensions import Annotated, TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict, total=False):
    task: str

    # Job state
    job_id: str
    output_dir: str
    
    # Document state
    raw_document_path: str
    source_document_name: str
    extracted_data: str
    validation_logs: str
    
    # RPA state 
    documents_generated: list[str]
    resume_document_generation: bool
    
    # Tracking state
    tracking_info: str
    
    # Analytics state
    kpi_recommendation: str
    
    # Control flow state
    ocr_review_level: str
    error_detected: bool
    error_message: str
    
    # Standard LangGraph state
    messages: Annotated[list[BaseMessage], operator.add]
    trace: Annotated[list[str], operator.add]
