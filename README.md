# README — Flusso agentico AI

Questo progetto implementa un flusso di agenti AI per automatizzare la gestione della **Bolla Doganale** e la generazione dei documenti operativi finali. Il sistema parte da un PDF non strutturato, estrae i dati, li valida, li classifica e produce in automatico l’autofattura Excel, la dichiarazione Word e i tracciati per il gestionale.

1. Il Grafo di Gestione (Supervisor Agent)
Ruolo: Un agente supervisore come Nemotron 3 super che riceve l'input documentale e decide dinamicamente l'albero di esecuzione.
Gestione dello Stato: Mantiene il contesto globale in memoria, aggiornando i dizionari di stato man mano che i dati vengono estratti, la merce tracciata e i KPI elaborati.

2. Agente di OCR Semantico e Validazione (Vision Agent)
Strumenti: Modelli multimodali open source come Kimi K2.5.
Azione: Esegue l'estrazione semantica dai file PDF unificati e dai documenti doganali non strutturati.
Logica applicata: Classifica le voci di spesa e applica regole di congruenza per la verifica automatica, intercettando errori e anomalie.


3. Agente RPA e Generazione Documentale (RPA/Doc Agent)
Strumenti: Nodi di LangGraph che eseguono script Python nativi (pandas, python-docx, openpyxl) o integrazioni con framework come Robot Framework.
Azione: Compila dinamicamente fogli Excel e documenti Word (autofatture, dichiarazioni) partendo dal JSON generato dal Vision Agent.
Integrazione: Gestisce l'archiviazione automatica e la generazione strutturata dei tracciati digitali per l'inserimento nei gestionali ERP aziendali.


4. Agente di Tracking e Route Planning (Logistics Agent)
Strumenti: Chiamate API (Tool Calling) verso servizi di spedizione e motori di routing open source (es. OSRM - Open Source Routing Machine).
Azione: Effettua il ping continuo delle API per il tracking in tempo reale della merce in transito.
Pianificazione: Calcola i percorsi ottimali su mappa in base ai vincoli logistici emersi durante le operazioni di import/export.

5. Agente Analitico e di Raccomandazione (Decision Agent)
Strumenti: Agente specializzato in data analysis, dotato di tool per l'esecuzione di query SQL sul database della dashboard.
Azione: Monitora i KPI e le metriche di performance in tempo reale.
Raccomandazione: Basandosi sulle logiche decisionali definite nel sistema, incrocia i costi estratti dalle fatture, l'affidabilità passata dei corrieri e i tempi di transito per fornire raccomandazioni prescrittive sui vettori da utilizzare e sulle rotte più convenienti.


## Flusso Operativo Implementato (Pipeline)
Ingestion: L'utente carica le bolle doganali o le fatture nel sistema; il Supervisor avvia il flusso. 

Comprensione Visiva: L'Agente OCR analizza il documento, estrae i campi chiave (mittente, destinatario, pesi, tariffe, codici doganali) e li valida.

Biforcazione del Flusso:
Ramo Amministrativo: Se i dati sono validi, l'Agente RPA genera istantaneamente i file Excel/Word necessari per le pratiche e popola l'ERP.

Ramo Operativo: L'Agente di Tracking acquisisce l'ID di spedizione e inizia a mappare la posizione della merce.

Sintesi e Raccomandazione: I dati confluiscono nel Decision Agent che alimenta la dashboard con i nuovi KPI e suggerisce all'operatore le ottimizzazioni per la rotta successiva o per la scelta di un nuovo corriere in caso di ritardi.

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