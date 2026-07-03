"""Semantic OCR node using LLMs for unstructured extraction and validation."""

from __future__ import annotations
import base64
import os
from typing import Literal
import re

import fitz
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import Command

from ..openrouter_client import get_chat_model
from ..prompts import OCR_PROMPT
from ..state import AgentState

def _pdf_pages_to_data_urls(pdf_path: str, max_pages: int = 1, render_scale: float = 1.4) -> list[str]:
    """Render the first PDF pages as compact JPEG data URLs for vision input."""
    data_urls: list[str] = []
    with fitz.open(pdf_path) as pdf:
        for idx in range(min(len(pdf), max_pages)):
            page = pdf[idx]
            pix = page.get_pixmap(matrix=fitz.Matrix(render_scale, render_scale), alpha=False)
            jpeg_bytes = pix.tobytes("jpeg", jpg_quality=75)
            encoded = base64.b64encode(jpeg_bytes).decode("ascii")
            data_urls.append(f"data:image/jpeg;base64,{encoded}")
    return data_urls


SECTION_EMOJIS = {
    "DATI GENERALI": "🧾",
    "DETTAGLIO MERCI E VALORI": "📦",
    "ESTRAZIONE DELLE RIGHE TRIBUTARIE": "💶",
    "VERIFICA CONTABILE E FISCALE": "🧮",
}

ReviewLevel = Literal["none", "warning", "error"]

REVIEW_CODE_PATTERN = r"\bcodice[_\s-]*esito\s*[:\-]\s*(ok|warning|error|errore)\b"


def _clean_section_title(line: str) -> str:
    clean = line.strip().replace("*", "")
    clean = re.sub(r"^[^\w]+", "", clean, flags=re.UNICODE)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean.upper().rstrip(":")


def _review_level_from_code(text: str) -> ReviewLevel | None:
    match = re.search(REVIEW_CODE_PATTERN, text, flags=re.IGNORECASE)
    if not match:
        return None
    code = match.group(1).lower()
    if code == "ok":
        return "none"
    if code == "warning":
        return "warning"
    if code in {"error", "errore"}:
        return "error"
    return None


def _ocr_review_level(text: str) -> ReviewLevel:
    # Si fida esclusivamente del codice esplicito generato dall'LLM
    coded = _review_level_from_code(text)
    if coded is not None:
        return coded
    
    # Fallback sicuro se l'LLM dimentica il codice ma il processo deve continuare
    return "none"


def _format_ocr_output(text: str) -> str:
    lines = text.splitlines()
    formatted: list[str] = []
    review_level = _ocr_review_level(text)
    esito_icon = {"none": "✅", "warning": "⚠️", "error": "‼️"}[review_level]

    for line in lines:
        raw_line = line
        stripped = raw_line.strip()
        if not stripped:
            formatted.append("")
            continue

        clean = stripped.replace("*", "")
        clean = re.sub(r"\s+", " ", clean).strip()
        clean = re.sub(r"^[\-–•]+\s*", "", clean)

        if re.search(REVIEW_CODE_PATTERN, clean, flags=re.IGNORECASE):
            continue

        if clean == "ESITO FINALE":
            formatted.append(f"{esito_icon} {clean}")
            continue

        if clean in SECTION_EMOJIS:
            formatted.append(f"{SECTION_EMOJIS[clean]} {clean}")
            continue

        if clean.endswith(":"):
            formatted.append(f"🔹 {clean}")
            continue

        indent = "  " if len(raw_line) - len(raw_line.lstrip()) >= 4 else ""
        formatted.append(f"{indent}- {clean}")

    return "\n".join(formatted).strip()



def semantic_ocr_node(state: AgentState) -> Command[Literal["apa_document_generation", "__end__"]]:
    """Extracts data from unstructured PDF using a multimodal LLM or standard text LLM with PDF parsing."""
    model = get_chat_model("semantic_ocr", temperature=0.1)

    pdf_path = state.get("raw_document_path", "dataset/Allegato1_Gemini.pdf")

    # The documents are scanned handwritten PDFs, so vision input is the primary path.
    image_data_urls: list[str] = _pdf_pages_to_data_urls(pdf_path)

    human_content: list[dict] = [
        {
            "type": "text",
            "text": (
                f"User task: {state.get('task', '')}\n"
                f"Document path: {pdf_path}\n\n"
                "Use the attached page images as the primary and only source for OCR semantic extraction and validation. "
                "This document is scanned and handwritten, so do not rely on embedded text. "
                "Read only the visible content in the images and return concise structured output."
            ),
        }
    ]
    for image_url in image_data_urls:
        human_content.append({"type": "image_url", "image_url": {"url": image_url}})

    response = model.invoke([
        SystemMessage(content=OCR_PROMPT),
        HumanMessage(content=human_content)
    ])
    
    # Save the output to job-specific output directory
    output_dir = state.get("output_dir", "test_output")
    os.makedirs(output_dir, exist_ok=True)
    out_file_path = os.path.join(output_dir, "ocr_output.txt")
    review_level = _ocr_review_level(response.content)
    formatted_output = _format_ocr_output(response.content)
    with open(out_file_path, "w", encoding="utf-8") as f:
        f.write(formatted_output)

    if review_level == "error":
        return Command(
            update={
                "extracted_data": response.content,
                "raw_document_path": pdf_path,
                "ocr_review_level": review_level,
                "documents_generated": [],
                "messages": [AIMessage(content=response.content)],
                "trace": [
                    "semantic_ocr completed.",
                    f"semantic_ocr input mode: vision-only ({len(image_data_urls)} pages)",
                    "semantic_ocr blocked document generation due to fatal OCR error.",
                ],
            },
            goto="__end__",
        )
    
    return Command(
        update={
            "extracted_data": response.content,
            "raw_document_path": pdf_path,
            "ocr_review_level": review_level,
            "messages": [AIMessage(content=response.content)],
            "trace": [
                "semantic_ocr completed.",
                f"semantic_ocr input mode: vision-only ({len(image_data_urls)} pages)",
            ]
        },
        goto="apa_document_generation"
    )
