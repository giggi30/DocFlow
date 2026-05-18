# DOCFLOW

DOCFLOW è un flusso agentico AI per automatizzare la gestione della **Bolla Doganale** e la produzione dei documenti operativi finali. Il sistema parte da un PDF non strutturato, estrae i dati, li valida, li classifica e genera in automatico l’autofattura Excel, la dichiarazione Word e i tracciati per il gestionale.

## Cosa fa

1. Il Grafo di Gestione (Supervisor Agent)
Ruolo: un agente supervisore che riceve l'input documentale e decide dinamicamente l'albero di esecuzione.
Gestione dello Stato: mantiene il contesto globale in memoria, aggiornando i dizionari di stato man mano che i dati vengono estratti, la merce tracciata e i KPI elaborati.

2. Agente di OCR Semantico e Validazione (Vision Agent)
Strumenti: modelli multimodali open source come Kimi K2.5.
Azione: esegue l'estrazione semantica dai PDF e dai documenti doganali non strutturati.
Logica applicata: classifica le voci di spesa e applica regole di congruenza per la verifica automatica, intercettando errori e anomalie.

3. Agente APA e Generazione Documentale (APA/Doc Agent)
Strumenti: nodi di LangGraph che eseguono script Python nativi (pandas, python-docx, openpyxl) o integrazioni con framework come Robot Framework.
Azione: compila dinamicamente fogli Excel e documenti Word partendo dal JSON generato dal Vision Agent.
Integrazione: gestisce l'archiviazione automatica e la generazione strutturata dei tracciati digitali per l'inserimento nei gestionali ERP aziendali.

4. Agente di Tracking e Route Planning (Logistics Agent)
Strumenti: chiamate API verso servizi di spedizione e motori di routing open source come OSRM.
Azione: effettua il ping continuo delle API per il tracking in tempo reale della merce in transito.
Pianificazione: calcola i percorsi ottimali su mappa in base ai vincoli logistici emersi durante le operazioni di import/export.

5. Agente Analitico e di Raccomandazione (Decision Agent)
Strumenti: agente specializzato in data analysis, con tool per l'esecuzione di query SQL sul database della dashboard.
Azione: monitora i KPI e le metriche di performance in tempo reale.
Raccomandazione: incrocia i costi estratti dalle fatture, l'affidabilità passata dei corrieri e i tempi di transito per fornire raccomandazioni sulle rotte e sui vettori da usare.

## Avvio locale

### Prerequisiti

- Python 3.11 o superiore
- Node.js 18 o superiore
- Una chiave `OPENROUTER_API_KEY` disponibile nell'ambiente

### Backend

Il backend espone le API FastAPI usate dal frontend e dal workflow LangGraph. Dal root del progetto:

```bash
source .venv/bin/activate
pip install -r requirements.txt
export OPENROUTER_API_KEY="la_tua_chiave"
uvicorn backend.app.api:app --reload --host 0.0.0.0 --port 8000
```

Se vuoi anche personalizzare il thread predefinito del workflow, puoi impostare `LANGGRAPH_THREAD_ID` oppure `APP_ENV` nello stesso ambiente.

### Frontend

Il frontend React/Vite usa un proxy verso il backend su `http://localhost:8000`, quindi il backend deve essere già in esecuzione.

```bash
cd frontend
npm install
npm run dev
```

Di default Vite avvia l'interfaccia su `http://localhost:5173`.

## Flusso operativo implementato

Ingestion: l'utente carica le bolle doganali o le fatture nel sistema; il Supervisor avvia il flusso.

Comprensione visiva: l'Agente OCR analizza il documento, estrae i campi chiave e li valida.

Biforcazione del flusso:
Ramo amministrativo: se i dati sono validi, l'Agente APA genera istantaneamente i file Excel/Word necessari per le pratiche e popola l'ERP.

Ramo operativo: l'Agente di Tracking acquisisce l'ID di spedizione e inizia a mappare la posizione della merce.

Sintesi e raccomandazione: i dati confluiscono nel Decision Agent che alimenta la dashboard con i nuovi KPI e suggerisce ottimizzazioni per la rotta successiva o per la scelta di un nuovo corriere in caso di ritardi.

## Regola di orchestrazione

Il workflow segue una logica **human-in-the-loop**: se un agente rileva un problema, il processo viene fermato e inviato in revisione; se tutto è valido, il flusso prosegue in automatico.

## Output finale

Il sistema produce:
- dati estratti e normalizzati;
- log di validazione;
- autofattura Excel;
- dichiarazione Word;
- tracciati per il gestionale;
- archivio documentale completo.

## Nota tecnica

L’architettura è pensata per essere modulare: ogni agente ha un compito specifico e comunica con il successivo tramite payload strutturati, così da rendere semplice manutenzione, estensioni future e integrazione con nuovi scenari documentali.