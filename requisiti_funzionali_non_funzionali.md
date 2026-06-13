# Lista dei Requisiti Web App - DOCFLOW

Il presente documento elenca i requisiti funzionali e non funzionali estratti dall'analisi dell'architettura agentica e del frontend del progetto **DOCFLOW**.

---

## 1. Requisiti Funzionali

Questi requisiti definiscono le capacità operative del sistema e le interazioni disponibili per l'utente.

### 1.1 Gestione Documentale e Ingestion

- **Caricamento **PDF**:** Il sistema deve permettere l'upload di una singola bolla doganale in formato **PDF** tramite un'area di dropzone.
- **Validazione Tipo File:** Il sistema deve accettare solo file in formato **PDF**, rifiutando altri formati in fase di selezione.
- **Estrazione Semantica (Vision):** Tramite l'agente **OCR**, il sistema deve estrarre automaticamente i campi chiave (Dati Generali, Merci, Valori, Righe Tributarie).

### 1.2 Orchestrazione Workflow

- **Routing Dinamico:** Un agente Supervisore deve decidere se inviare il documento all'analisi **OCR**, alla generazione documenti o alla logistica.
- **Human-in-the-loop:** Il workflow deve interrompersi e richiedere l'intervento umano (stato `review_required`) in caso di errori fiscali o matematici gravi rilevati dall'agente **OCR**.
- **Sincronizzazione Stato:** Il sistema deve mantenere la memoria del contesto globale durante tutto il ciclo di vita dell'elaborazione tramite un grafo di stato (LangGraph).

### 1.3 Validazione e Analisi

- **Verifica Contabile:** Il sistema deve calcolare e verificare la coerenza tra basi imponibili, aliquote **IVA**, dazi e totali.
- **Gestione Discrepanze:** Deve identificare differenze minime (es. 0.01€), distinguendo tra arrotondamenti (**WARNING**) ed errori bloccanti (**ERROR**).

### 1.4 Generazione Documenti (Agente APA)

- **Autofattura Excel:** Generazione automatica di un file `.xlsx` strutturato con i dettagli dell'articolo e la liquidazione tributi.
- **Autodichiarazione Word:** Compilazione dinamica di un template `.docx` riempiendo i campi mancanti con i dati estratti.
- **Normalizzazione Nomi:** Il sistema deve inferire il nome azienda (slug) dal nome del file **PDF** originale per rinominare gli output.

### 1.5 Monitoraggio e Logistica

- **Dashboard di Stato:** Visualizzazione in tempo reale dello stato del job (queued, running, completed, failed).
- **Tracking Merci:** Integrazione con **API** di terze parti per il monitoraggio real-time della posizione della merce.
- **Pianificazione Rotte:** Calcolo del percorso ottimale basato su vincoli logistici tramite motori come **OSRM**.
- **Supporto Decisionale:** Fornitura di raccomandazioni prescrittive sui vettori più convenienti basate su **KPI** di costo e affidabilità.

### 1.6 Archivio e Consultazione

- **Storico Documenti:** Pagina dedicata per consultare tutti i documenti processati.
- **Filtri:** Possibilità di filtrare l'archivio per tipologia di documento.
- **Preview In-App:** Visualizzazione dell'anteprima dei file (**PDF**, **TXT**, Immagini) direttamente nell'interfaccia senza download obbligatorio.

---

## 2. Requisiti Non Funzionali

Questi requisiti definiscono gli attributi di qualità, le prestazioni e i vincoli tecnici del sistema.

### 2.1 Usabilità e User Experience (UX)

- **Interfaccia Semplificata:** La dashboard deve essere organizzata in tre sezioni chiare: Upload, Stato Job e Risultati.
- **Efficienza Operativa:** Riduzione dei click; un singolo pulsante deve gestire sia l'upload che l'avvio dell'analisi.
- **Feedback Visivo:** Utilizzo di stati di caricamento (skeleton/loading), messaggi d'errore parlanti e stati vuoti (empty states).

### 2.2 Prestazioni

- **Asincronia:** Le operazioni pesanti (**OCR** e generazione documenti) devono essere gestite come job asincroni per non bloccare la UI.
- **Reattività:** La UI deve aggiornare lo stato del job tramite polling ogni 3 secondi.

### 2.3 Sicurezza e Affidabilità

- **Persistenza del Workflow:** Utilizzo di `thread_id` per garantire la ripresa del processo in caso di interruzioni.
- **Validazione Dati:** I dati monetari devono essere normalizzati con la virgola come separatore decimale per compatibilità con gli standard contabili italiani.
- **Fault Tolerance:** Il fallimento di un singolo agente (es. Tracking) non deve causare il crash dell'intero sistema di generazione documenti.

### 2.4 Manutenibilità e Architettura

- **Modularità Agentica:** Architettura basata su agenti indipendenti specializzati.
- **Tecnologie Frontend:** Sviluppo in React con TypeScript per garantire la tipizzazione dei dati scambiati con il backend.
- **Interfaccia **API**:** Backend sviluppato con FastAPI per garantire alte prestazioni e documentazione automatica (OpenAPI).
- **Struttura Modulare:** Separazione netta tra logica **API**, componenti UI, hook personalizzati e definizioni di tipo.

---