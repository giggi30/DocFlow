"""RPA & Document Generation node using LLM for structured extraction and document compilation."""

from __future__ import annotations

import json
import os
import re
import time
from copy import copy
from typing import Literal

from openpyxl.worksheet.cell_range import CellRange

import openpyxl
from docx import Document as DocxDocument
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import Command

from ..openrouter_client import get_chat_model
from ..prompts import RPA_PROMPT
from ..state import AgentState

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_INVOKE_RETRIES = 3
RETRY_DELAY_SECONDS = 5

# ---------------------------------------------------------------------------
# Paths (relative to project root, which is the CWD at runtime)
# ---------------------------------------------------------------------------
DEFAULT_OUTPUT_DIR = "test_output"
DEFAULT_OCR_OUTPUT_PATH = os.path.join(DEFAULT_OUTPUT_DIR, "ocr_output.txt")
AUTOFATTURA_TEMPLATE = "allegati/autofattura.xlsx"
AUTODICHIARAZIONE_TEMPLATE = "allegati/autodichiarazione_riordinata.docx"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_ocr_output(path: str) -> str:
    """Read the OCR output text file."""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _extract_json(text: str) -> dict:
    """Extract a JSON object from the LLM response, handling markdown fences."""
    # Try to find JSON inside ```json ... ``` blocks first
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    # Try raw JSON
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"Impossibile estrarre JSON dalla risposta LLM:\n{text[:500]}")


def _safe_insert_rows(ws, row: int, count: int = 1) -> None:
    """Insert *count* rows at *row* and properly shift merged-cell ranges.

    This version of openpyxl shifts cell **content** on ``insert_rows``
    but does **not** shift merged-cell ranges.  This helper compensates
    by manually adjusting every merge that starts at or below the
    insertion point, and expanding any merge that spans it.
    """
    to_shift = []   # merges entirely at or below the insert point
    to_expand = []  # merges that start above but extend into the insert point

    for mc in list(ws.merged_cells.ranges):
        if mc.min_row >= row:
            to_shift.append(mc)
        elif mc.max_row >= row:
            to_expand.append(mc)

    # Remove affected merges from the registry
    for mc in to_shift + to_expand:
        ws.merged_cells.ranges.discard(mc)

    # Actually insert the rows (shifts cell content only)
    ws.insert_rows(row, count)

    # Re-add merges shifted down by *count*
    for mc in to_shift:
        shifted = CellRange(
            min_col=mc.min_col, max_col=mc.max_col,
            min_row=mc.min_row + count, max_row=mc.max_row + count,
        )
        ws.merged_cells.ranges.add(shifted)

    # Re-add merges that spanned the insert point, now expanded
    for mc in to_expand:
        expanded = CellRange(
            min_col=mc.min_col, max_col=mc.max_col,
            min_row=mc.min_row, max_row=mc.max_row + count,
        )
        ws.merged_cells.ranges.add(expanded)

    # Finally, remove any merge that (still) covers the new data row
    stale = [mc for mc in list(ws.merged_cells.ranges)
             if mc.min_row <= row <= mc.max_row]
    for mc in stale:
        ws.merged_cells.ranges.discard(mc)


def _fill_autofattura(data: dict, template_path: str, output_path: str) -> str:
    """Fill the autofattura Excel template with extracted data."""
    wb = openpyxl.load_workbook(template_path)
    ws = wb.active

    # Helper to write a value while preserving the field label (key-value approach)
    def safe_write(cell_ref: str, value: str) -> None:
        if not value or str(value).strip() == "":
            value = "N/D"
        try:
            current_val = ws[cell_ref].value
            current_str = str(current_val).strip() if current_val else ""
            
            if current_str:
                # If there's already a colon, it might be a pre-formatted template
                if ":" in current_str and not current_str.endswith(":"):
                    pass # Keep as is or we can replace the value
                elif ":" in current_str and current_str.endswith(":"):
                    ws[cell_ref] = f"{current_str} {value}"
                elif "\n" in current_str:
                    ws[cell_ref] = f"{current_str}\n{value}"
                else:
                    ws[cell_ref] = f"{current_str}: {value}"
            else:
                ws[cell_ref] = value
        except AttributeError:
            pass  # merged cell slave — skip silently

    def _insert_data_row(row: int) -> None:
        """Insert a blank row and properly shift any overlapping merges."""
        _safe_insert_rows(ws, row)

    af = data.get("autofattura", {})

    # --- Row 1: Header fields ---
    # In the template A1 is "Dettagli Articolo n° 1". If we pass the number, it becomes "Dettagli Articolo n° 1: 1"
    safe_write("A1", af.get("numero_articolo", "1"))
    safe_write("E1", af.get("regime", ""))
    safe_write("G1", af.get("cod_svincolo", ""))
    safe_write("I1", af.get("data_svincolo", ""))
    safe_write("K1", af.get("num_a93", ""))
    safe_write("L1", af.get("anno_a93", ""))
    safe_write("M1", af.get("data_rilascio", ""))
    safe_write("N1", af.get("num_quietanza", ""))
    safe_write("O1", af.get("data_quietanza", ""))

    # --- Row 2: Product codes & weights ---
    safe_write("A2", af.get("codice_merce", ""))
    safe_write("E2", af.get("massa_lordo", ""))
    safe_write("G2", af.get("massa_netta", ""))
    safe_write("I2", af.get("unita_supplementare", ""))
    safe_write("L2", af.get("regimi_aggiuntivi", ""))
    safe_write("O2", af.get("container", ""))

    # --- Row 3: Description ---
    safe_write("A3", af.get("descrizione_merce", ""))
    safe_write("L3", af.get("preferenze", ""))
    safe_write("N3", af.get("contingente", ""))

    # --- Row 4-5: Countries & values ---
    safe_write("A4", af.get("paese_sped", ""))
    safe_write("C4", af.get("paese_dest", ""))
    safe_write("E4", af.get("prov_dest", ""))
    safe_write("G4", af.get("paese_orig", ""))
    safe_write("I4", af.get("paese_orig_pref", ""))
    safe_write("K4", af.get("natura_transaz", ""))
    safe_write("L4", af.get("prezzo_art", ""))
    safe_write("N4", af.get("valore_stat", ""))

    # --- Row 7/8: Aggiunte/Detrazioni ---
    aggiunte = af.get("aggiunte_detrazioni", [])
    extra_agg = 0
    if aggiunte and isinstance(aggiunte, list):
        for i, agg in enumerate(aggiunte):
            insert_row = 8 + i
            _insert_data_row(insert_row)
            ws.cell(row=insert_row, column=1, value=agg.get("codice", ""))
            ws.cell(row=insert_row, column=3, value=agg.get("descrizione", ""))
            ws.cell(row=insert_row, column=11, value=agg.get("importo", ""))
        extra_agg = len(aggiunte)

    # --- Tributi: header row is at (original 8 "Liquidazione" + 1 "headers") + extra_agg
    # Template layout: row 8 = "Liquidazione", row 9 = headers (Tributo, Imponibile, ...)
    # After aggiunte inserts: headers shift to row (9 + extra_agg), data goes after.
    tributi_headers_row = 9 + extra_agg
    # Data rows are inserted right after the header + 1 (skipping the existing "Sconti" label
    # which is actually the NEXT section).  We insert BETWEEN the header and the next section.
    tributi_data_start = tributi_headers_row + 1
    tributi = af.get("tributi", [])
    extra_trib = 0
    if tributi and isinstance(tributi, list):
        for i, trib in enumerate(tributi):
            insert_row = tributi_data_start + i
            _insert_data_row(insert_row)
            ws.cell(row=insert_row, column=1, value=trib.get("tributo", ""))
            ws.cell(row=insert_row, column=3, value=trib.get("imponibile", ""))
            ws.cell(row=insert_row, column=5, value=trib.get("quantita", ""))
            ws.cell(row=insert_row, column=7, value=trib.get("unita_misura", ""))
            ws.cell(row=insert_row, column=9, value=trib.get("aliquota", ""))
            ws.cell(row=insert_row, column=11, value=trib.get("importo", ""))
            ws.cell(row=insert_row, column=13, value=trib.get("metodo_pag", ""))
        extra_trib = len(tributi)
    
    # --- Scarichi headers (original row 10 "Sconti" + row 11 headers) ---
    scarichi_headers_row = 11 + extra_agg + extra_trib
    scarichi_data_row = scarichi_headers_row + 1
    scarichi = af.get("scarichi", [])
    extra_scarichi = 0
    if scarichi and isinstance(scarichi, list):
        for i, scarico in enumerate(scarichi):
            insert_row = scarichi_data_row + i
            _insert_data_row(insert_row)
            ws.cell(row=insert_row, column=1, value=scarico.get("tipo", ""))
            ws.cell(row=insert_row, column=3, value=scarico.get("riferimento", ""))
            ws.cell(row=insert_row, column=9, value=scarico.get("art.", ""))
            ws.cell(row=insert_row, column=11, value=scarico.get("num. imb.", ""))
            ws.cell(row=insert_row, column=12, value=scarico.get("quantita", ""))
            ws.cell(row=insert_row, column=13, value=scarico.get("unita", ""))
        extra_scarichi = len(scarichi)

    # --- Documenti headers (original row 12 "Documenti" + row 13 headers) ---
    doc_headers_row = 13 + extra_agg + extra_trib + extra_scarichi
    doc_data_row = doc_headers_row + 1
    documenti = af.get("documenti", [])
    extra_docs = 0
    if documenti and isinstance(documenti, list):
        for i, doc in enumerate(documenti):
            insert_row = doc_data_row + i
            _insert_data_row(insert_row)
            ws.cell(row=insert_row, column=1, value=doc.get("codice", ""))
            ws.cell(row=insert_row, column=3, value=doc.get("identificativo", ""))
            ws.cell(row=insert_row, column=5, value=doc.get("data", ""))
            ws.cell(row=insert_row, column=7, value=doc.get("uni_mis", ""))
            ws.cell(row=insert_row, column=9, value=doc.get("quantita", ""))
            ws.cell(row=insert_row, column=11, value=doc.get("codice_valuta", ""))
            ws.cell(row=insert_row, column=16, value=doc.get("importo", ""))
        extra_docs = len(documenti)

    # --- Colli headers (original row 14 "Colli" + row 15 headers) ---
    colli_headers_row = 15 + extra_agg + extra_trib + extra_scarichi + extra_docs
    colli_data_row = colli_headers_row + 1
    _insert_data_row(colli_data_row)
    ws.cell(row=colli_data_row, column=1, value=af.get("tipo_imb", ""))
    ws.cell(row=colli_data_row, column=3, value=af.get("numero_imb", ""))
    ws.cell(row=colli_data_row, column=5, value=af.get("marchi_spedizione", ""))

    wb.save(output_path)
    return output_path



def _extract_docx_text(path: str) -> str:
    """Extract text from a Word document for the LLM prompt context."""
    try:
        doc = DocxDocument(path)
        lines = []
        for p in doc.paragraphs:
            if p.text.strip():
                lines.append(p.text.strip())
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                if row_text:
                    lines.append(row_text)
        return "\n".join(lines)
    except Exception as e:
        return f"Impossibile leggere il template: {e}"


def _fill_autodichiarazione(data: dict, template_path: str, output_path: str) -> str:
    """Fill the autodichiarazione Word template by replacing underscores sequentially."""
    doc = DocxDocument(template_path)
    
    # The LLM now returns an array of strings for 'autodichiarazione'
    ad_values = data.get("autodichiarazione", [])
    if not isinstance(ad_values, list):
        if isinstance(ad_values, dict):
            # fallback if the LLM still returns a dict for some reason
            ad_values = list(ad_values.values())
        else:
            ad_values = [str(ad_values)]
            
    val_idx = 0

    def replace_in_paragraph(paragraph) -> None:
        nonlocal val_idx
        text = paragraph.text
        if not text:
            return
            
        # Match sequences of 3 or more underscores
        matches = list(re.finditer(r"_{3,}", text))
        if not matches:
            return
            
        def repl(match):
            nonlocal val_idx
            if val_idx < len(ad_values):
                val = ad_values[val_idx]
                val_idx += 1
                return str(val) if val else ""
            else:
                return match.group(0) # Keep original underscores if no more values
                
        new_text = re.sub(r"_{3,}", repl, text)
        
        # Rebuild runs preserving the first run's formatting
        if paragraph.runs:
            first_run = paragraph.runs[0]
            # Clear all subsequent runs
            for run in paragraph.runs[1:]:
                run.text = ""
            first_run.text = new_text

    for paragraph in doc.paragraphs:
        replace_in_paragraph(paragraph)

    # Also check tables if any
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    replace_in_paragraph(paragraph)

    doc.save(output_path)
    return output_path


# ---------------------------------------------------------------------------
# Node
# ---------------------------------------------------------------------------

def _get_llm_content(response) -> str:
    """Extract useful content from an LLM response, handling thinking-mode models.
    
    qwen/qwen3.6-plus may use thinking mode where the actual output is empty and reasoning
    goes into additional_kwargs['reasoning_content'] or response_metadata.
    """
    content = response.content or ""
    
    # If content is non-empty, return it directly
    if content.strip():
        return content
    
    # Check additional_kwargs for reasoning_content (Qwen thinking mode)
    ak = getattr(response, "additional_kwargs", {}) or {}
    reasoning = ak.get("reasoning_content", "")
    if reasoning:
        return reasoning
    
    # Check response_metadata
    rm = getattr(response, "response_metadata", {}) or {}
    if rm.get("reasoning_content"):
        return rm["reasoning_content"]
    
    return content


def _invoke_with_retry(model, messages: list) -> "AIMessage":
    """Invoke the LLM with retry logic for transient API errors.
    
    OpenRouter can return truncated/invalid HTTP response bodies (especially
    with Qwen thinking-mode models), causing JSONDecodeError inside the OpenAI
    client before our code even sees the response.  This wrapper retries on
    such transient failures.
    """
    last_error = None
    for attempt in range(1, MAX_INVOKE_RETRIES + 1):
        try:
            return model.invoke(messages)
        except json.JSONDecodeError as exc:
            last_error = exc
            print(
                f"⚠️  RPA invoke attempt {attempt}/{MAX_INVOKE_RETRIES} failed "
                f"(JSONDecodeError from API response): {exc}"
            )
            if attempt < MAX_INVOKE_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)
        except Exception as exc:
            # Catch other transient errors (timeouts, connection resets, etc.)
            last_error = exc
            print(
                f"⚠️  RPA invoke attempt {attempt}/{MAX_INVOKE_RETRIES} failed "
                f"({type(exc).__name__}): {exc}"
            )
            if attempt < MAX_INVOKE_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * attempt)
    raise RuntimeError(
        f"RPA LLM invocation failed after {MAX_INVOKE_RETRIES} attempts. "
        f"Last error: {last_error}"
    )


def rpa_document_generation_node(state: AgentState) -> Command[Literal["tracking_route_planning"]]:
    """RPA node: uses LLM to map OCR data → JSON, then fills Excel & Word templates."""
    model = get_chat_model("rpa_document_generation", temperature=0.1)

    output_dir = state.get("output_dir", DEFAULT_OUTPUT_DIR)
    ocr_output_path = os.path.join(output_dir, "ocr_output.txt")

    # 1. Read OCR output
    ocr_text = ""
    if os.path.exists(ocr_output_path):
        ocr_text = _read_ocr_output(ocr_output_path)

    # 2. Also use extracted_data from state if available (freshest data)
    extracted = state.get("extracted_data", "")
    if extracted:
        ocr_text = extracted

    # 3. Read autodichiarazione template text to provide to LLM
    template_text = _extract_docx_text(AUTODICHIARAZIONE_TEMPLATE)

    # 4. Call LLM to produce structured JSON mapping (with retry for transient errors)
    messages = [
        SystemMessage(content=RPA_PROMPT),
        HumanMessage(content=(
            "Below is the OCR analysis output of a customs declaration (bolla doganale). "
            "Analyze it and generate the structured JSON to fill the autofattura and autodichiarazione.\n\n"
            f"--- OCR OUTPUT ---\n{ocr_text}\n--- END OCR OUTPUT ---\n\n"
            f"--- TESTO TEMPLATE AUTODICHIARAZIONE ---\n{template_text}\n--- FINE TEMPLATE ---"
        ))
    ]

    try:
        response = _invoke_with_retry(model, messages)
    except RuntimeError as exc:
        # All retries exhausted — graceful fallback
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        return Command(
            update={
                "documents_generated": [],
                "messages": [AIMessage(content=f"❌ Errore nella chiamata LLM (tutti i tentativi falliti): {exc}")],
                "trace": [f"rpa_document_generation FAILED (API error): {exc}"],
            },
            goto="tracking_route_planning",
        )

    # 4. Parse JSON from LLM response
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract content handling thinking-mode models
    llm_content = _get_llm_content(response)
    
    # Always dump the full response for debugging
    debug_path = os.path.join(output_dir, "rpa_raw_response.txt")
    with open(debug_path, "w", encoding="utf-8") as f:
        f.write(f"=== content ===\n{response.content}\n\n")
        f.write(f"=== additional_kwargs ===\n{getattr(response, 'additional_kwargs', {})}\n\n")
        f.write(f"=== response_metadata ===\n{getattr(response, 'response_metadata', {})}\n\n")
        f.write(f"=== resolved llm_content ===\n{llm_content}\n")

    try:
        mapping = _extract_json(llm_content)

        # Save the raw JSON mapping for debugging
        json_out = os.path.join(output_dir, "rpa_mapping.json")
        with open(json_out, "w", encoding="utf-8") as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2)

        # 5. Fill autofattura.xlsx
        autofattura_out = os.path.join(output_dir, "autofattura_compilata.xlsx")
        _fill_autofattura(mapping, AUTOFATTURA_TEMPLATE, autofattura_out)

        # 6. Fill autodichiarazione_riordinata.docx
        autodichiarazione_out = os.path.join(output_dir, "autodichiarazione_compilata.docx")
        _fill_autodichiarazione(mapping, AUTODICHIARAZIONE_TEMPLATE, autodichiarazione_out)

        documents = [autofattura_out, autodichiarazione_out]
        summary = (
            f"✅ Documenti generati con successo:\n"
            f"  - Autofattura: {autofattura_out}\n"
            f"  - Autodichiarazione: {autodichiarazione_out}\n"
            f"  - Mapping JSON: {json_out}"
        )
        trace_entries = [
            "rpa_document_generation completed.",
            f"autofattura salvata: {autofattura_out}",
            f"autodichiarazione salvata: {autodichiarazione_out}",
        ]

    except (json.JSONDecodeError, ValueError, KeyError) as exc:
        documents = []
        summary = f"❌ Errore nella generazione documenti: {exc}\n\nRisposta LLM:\n{llm_content[:1000]}"
        trace_entries = [f"rpa_document_generation FAILED: {exc}"]

    return Command(
        update={
            "documents_generated": documents,
            "messages": [AIMessage(content=summary)],
            "trace": trace_entries,
        },
        goto="__end__",
    )

