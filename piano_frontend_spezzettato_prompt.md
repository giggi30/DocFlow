# Piano frontend spezzettato per AI coding assistant

Questo documento divide lo sviluppo del frontend in micro-task separati, così da lavorare con Copilot, ChatGPT o altri coding assistant senza sovraccaricare il contesto. Il progetto di riferimento è una web app React collegata a un backend Python che gestisce OCR, job asincroni e generazione documenti per bolle doganali. [cite:7]

## Regola di utilizzo

Usare un task alla volta. Prima si completa il task corrente, si verifica che funzioni, poi si passa al successivo. Questo approccio riduce gli errori e rende più semplice correggere il codice generato dall'AI. [cite:7]

## Template prompt base

Copia questo schema e sostituisci la parte del task:

```text
Sto sviluppando un frontend React per un backend Python che gestisce OCR e generazione documenti da bolla doganale PDF.

Lavora solo su questo task:
[DESCRIZIONE TASK]

Vincoli:
- usa React con TypeScript
- non toccare file non necessari
- scrivi codice semplice e modulare
- niente refactor globale
- dimmi esattamente quali file creare o modificare

Output richiesto:
- codice completo dei file
- breve spiegazione di come testarli
```

## Ordine consigliato

| Step | Task | Obiettivo |
|---|---|---|
| 1 | Setup iniziale | Creare la base del progetto |
| 2 | Layout base | Costruire la shell della web app |
| 3 | Upload PDF | Caricare la bolla doganale |
| 4 | Avvio job | Far partire il flusso backend |
| 5 | Polling stato | Monitorare il job asincrono |
| 6 | Riepilogo OCR | Mostrare il testo prodotto dall'OCR |
| 7 | Artefatti job | Elencare i documenti generati |
| 8 | Archivio documenti | Avere una vista globale dei documenti |
| 9 | Preview documenti | Aprire i file direttamente in app |
| 10 | Rifinitura UX | Curare loading, errori e stati vuoti |

## Prompt 1 - Setup iniziale

```text
Crea la struttura iniziale di un frontend React + TypeScript con Vite per una web app documentale.

Mi servono:
- React Router
- cartelle pages, components, api, hooks, types
- due pagine vuote: DashboardPage e ArchivePage
- layout base con navbar o sidebar
- App.tsx e main.tsx puliti

Vincoli:
- codice semplice
- niente librerie inutili
- non implementare ancora chiamate API
```

### Verifica
- L'app parte con `npm run dev`.
- Esistono due route base.
- Il progetto ha già una struttura chiara.

## Prompt 2 - Layout base

```text
Implementa il layout base della web app React.

Mi servono:
- sidebar con voci Dashboard e Archivio documenti
- header con titolo applicazione
- area contenuto centrale
- stile semplice e pulito

Vincoli:
- componenti separati
- responsive base
- niente logica backend
```

### Verifica
- Si può navigare tra Dashboard e Archivio.
- Il layout è stabile anche su schermi piccoli.
- Header e sidebar non contengono logica applicativa.

## Prompt 3 - Upload PDF

```text
Implementa il componente UploadDropzone per caricare un PDF della bolla doganale.

Mi servono:
- selezione file PDF
- validazione tipo file
- pulsante upload
- chiamata POST /upload
- gestione loading ed errore

Vincoli:
- un solo file
- niente polling
- mostra filename e stato upload
```

### Verifica
- Il file PDF viene accettato.
- Un file non PDF viene rifiutato.
- L'upload restituisce un `fileId` salvabile nello stato.

## Prompt 4 - Avvio job

```text
Implementa l'avvio del job backend dopo l'upload del file.

Mi servono:
- pulsante Avvia elaborazione
- chiamata POST /jobs/start con fileId
- risposta con jobId
- visualizzazione del jobId a schermo

Vincoli:
- non implementare ancora il polling
- separa la logica API in un file dedicato
```

### Verifica
- Il bottone è attivo solo quando `fileId` esiste.
- Il backend restituisce `jobId`.
- Il valore viene mostrato senza errori a schermo.

## Prompt 5 - Polling stato job

```text
Implementa il polling dello stato job.

Mi servono:
- hook useJobPolling(jobId)
- chiamata GET /jobs/{jobId} ogni 3 secondi
- stati: queued, running, completed, failed
- card JobStatusCard per mostrare stato, step corrente, eventuale errore

Vincoli:
- fermare polling quando job è completed o failed
- codice semplice e leggibile
```

### Verifica
- Il polling si interrompe correttamente.
- Lo stato cambia a schermo.
- Gli errori backend sono visibili in modo leggibile.

## Prompt 6 - Riepilogo OCR

```text
Implementa il pannello OCRSummaryPanel.

Mi servono:
- fetch GET /jobs/{jobId}/ocr-summary quando il job è completed
- visualizzazione testo OCR/AI in pannello read-only
- pulsante copia testo
- gestione loading e assenza contenuto
```

### Verifica
- Il testo compare solo a job completato.
- Il pulsante copia funziona.
- In assenza di contenuto compare uno stato vuoto chiaro.

## Prompt 7 - Lista documenti generati dal job

```text
Implementa la lista documenti prodotti dal job.

Mi servono:
- fetch GET /jobs/{jobId}/artifacts
- lista file con nome, tipo e pulsante download
- integrazione nella DashboardPage

Vincoli:
- non fare ancora archivio globale
- componenti separati
```

### Verifica
- La lista compare a job completato.
- Ogni documento ha almeno nome, tipo e download.
- La dashboard resta leggibile.

## Prompt 8 - Archivio documenti

```text
Implementa la pagina Archivio documenti.

Mi servono:
- fetch GET /documents
- tabella o lista con nome, tipo, data, provenienza e job associato
- filtri per tipo documento
- click su un documento per aprire preview

Vincoli:
- pagina separata
- dati mockati se necessario
```

### Verifica
- La pagina mostra tutti i documenti disponibili.
- I filtri funzionano.
- Il click seleziona il documento corretto.

## Prompt 9 - Preview documenti in-app

```text
Implementa il componente DocumentPreviewPanel.

Mi servono:
- preview PDF con iframe/object
- preview TXT come testo formattato
- preview immagini
- fallback per file non previewabili
- bottone download

Vincoli:
- input: oggetto documento con mimeType, previewUrl e downloadUrl
- niente librerie pesanti se non necessarie
```

### Verifica
- I PDF si aprono dentro l'app.
- I TXT si leggono senza scaricarli.
- I file non supportati mostrano fallback + download.

## Prompt 10 - Rifinitura UX

```text
Migliora la UX della web app documentale.

Mi servono:
- empty state
- loading state
- error state
- pulsanti disabilitati quando serve
- messaggi chiari per utente finale
- meno sezioni separate nella dashboard, più focus sui task principali
- riduci i click necessari per analizzare un documento e vedere i risultati (un solo pulsante per caricare e analizzare il pdf)
- nella dashboard sono necesari solo 3 sezoni(rettangoli): upload pdf, stato job e risultati (ocr + documenti generati)

Vincoli:
- solo miglioramenti visivi e di interazione (UI)
- solo miglioramenti UX
```

### Verifica
- Nessuna schermata appare “rotta” in assenza dati.
- I pulsanti hanno stati coerenti.
- Gli errori sono comprensibili anche a un utente non tecnico.

## Prompt extra - API mock temporanee

Se il backend non è ancora collegato del tutto, questo prompt aiuta a procedere senza bloccarsi:

```text
Crea mock temporanei per le API del frontend React.

Mi servono:
- risposta mock per upload
- risposta mock per start job
- stato job simulato
- riepilogo OCR simulato
- lista documenti mock

Vincoli:
- facile da rimuovere dopo
- nessuna dipendenza inutile
- struttura dati coerente con future API reali
```

## Metodo consigliato di lavoro

- Eseguire uno step per volta.
- Non chiedere mai all'AI di fare tutto in un unico prompt.
- Dopo ogni step, chiedere un fix mirato solo sui problemi emersi.
- Quando uno step è stabile, congelarlo e passare al successivo.
- Tenere separati layout, logica API, componenti UI e tipi TypeScript.

## Consiglio finale

Per questo progetto, la combinazione più robusta è: backend Python già esistente, frontend React piccolo ma ben strutturato, e sviluppo incrementale guidato da prompt corti. Questo approccio è particolarmente adatto quando si lavora con assistant di coding che tendono a peggiorare quando ricevono richieste troppo grandi in una sola volta. [cite:7]
