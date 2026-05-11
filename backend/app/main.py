"""CLI entrypoint for the DOCFLOW LangGraph workflow."""

from __future__ import annotations

import argparse

from langchain_core.messages import HumanMessage

from .config import get_config
from .graph import workflow


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="Run the DOCFLOW multi-agent workflow.")
	default_task = (
		"Ricevi in input un PDF di bolla doganale non strutturato e instradalo all’agente semantic_ocr "
		"per l’analisi documentale. L’agente deve leggere il PDF, identificarne la natura di bolla doganale/import document, "
		"estrarre in modalità semantica i campi rilevanti del flusso e restituire un output strutturato, normalizzato e validabile."
	)
	parser.add_argument("--task", default=default_task, help="Task to process with the agent workflow")
	parser.add_argument(
		"--thread-id",
		default=None,
		help="Thread identifier used by LangGraph persistence (defaults to LANGGRAPH_THREAD_ID or docflow-dev)",
	)
	parser.add_argument("--stream", action="store_true", help="Stream intermediate updates")
	return parser.parse_args()


def main() -> None:
	args = parse_args()
	settings = get_config()
	thread_id = args.thread_id or settings.default_thread_id
	config = {"configurable": {"thread_id": thread_id}}
	initial_state = {
		"task": args.task, 
		"raw_document_path": "allegati/Allegato1_Gemini.pdf",
		"source_document_name": "Allegato1_Gemini.pdf",
		"messages": [HumanMessage(content=args.task)]
	}

	if args.stream:
		for update in workflow.stream(initial_state, config, stream_mode="updates"):
			print(update)
		return

	result = workflow.invoke(initial_state, config)
	print(result.get("final_answer", result.get("draft", "")))


if __name__ == "__main__":
	main()
