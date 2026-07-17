# Architettura DocFlow-Demo

DocFlow-Demo è una piattaforma per l'elaborazione intelligente di documenti, basata su un'architettura **Client-Server** moderna con un forte focus sull'integrazione di Large Language Models (LLM).

## 1. Frontend (React + TypeScript)
Gestisce l'interfaccia utente, la visualizzazione dei risultati e il monitoraggio dei processi in tempo reale.

*   **Componenti UI (`frontend/src/components/`):**
    *   `OcrSummaryPanel.tsx`: Gestisce la visualizzazione dinamica dei risultati dell'analisi. Include logica di polling per aggiornamenti asincroni e parsing degli esiti (OK, Warning, Error).
    *   `JobStatusCard.tsx`: Fornisce feedback visivo sullo stato di avanzamento dei lavori.
    *   `JobArtifactsList.tsx`: Elenca i file generati (es. JSON, PDF, estratti) disponibili per il download.
*   **Gestione API (`frontend/src/api/`):** Implementa i client per comunicare con i servizi backend.
*   **Sistemi di Styling:** Utilizza CSS moderno (visto in `index.css`) con una metodologia basata su componenti.

## 2. Backend (Python + LLM Frameworks)
Il nucleo computazionale che orchestra l'analisi semantica dei documenti.

*   **Pipeline di Elaborazione (`backend/app/nodes/`):** Utilizza un approccio a nodi (es. `semantic_ocr.py`) per decomporre compiti complessi di analisi in step atomici e verificabili.
*   **Gestione Prompt (`backend/app/prompts.py`):** Centralizza la logica di "istruzione" dei modelli AI. Definisce le regole di business e i criteri di validazione che l'AI deve seguire.
*   **Astrazione Modelli (`backend/app/models_registry.py`):** Permette l'intercambiabilità dei modelli (OpenAI, Anthropic, ecc.) e la configurazione centralizzata dei parametri di inferenza.

## 3. Data & Storage Layer
L'applicazione utilizza un sistema di persistenza basato su file per velocità e semplicità di demo.

*   **Persistenza JSON (`archive/`):** Utilizza file come `documents.json` e `users.json` per simulare un database, mantenendo traccia dello stato dei job, dei metadati dei documenti e delle configurazioni utente.
*   **File Management (`uploads/` & `dataset/`):** Gestisce i file sorgente caricati e i dataset utilizzati per il training o il testing.

## Flusso di Dati (Workflow)

1.  **Caricamento:** L'utente carica un documento tramite il frontend.
2.  **Accodamento:** Il backend crea un Job e lo inserisce nello stato `queued`.
3.  **Elaborazione AI:** Il nodo `semantic_ocr` processa il testo, applicando le regole definite nei `prompts`.
4.  **Validazione:** L'AI assegna un `reviewLevel`. Se critico (Error), il job passa a `review_required`.
5.  **Notifica:** Il frontend, tramite polling, rileva il completamento o la necessità di revisione e aggiorna l'interfaccia dell'utente.
