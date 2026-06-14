import { useEffect, useMemo, useState } from 'react'
import { getOcrSummary } from '../api/jobs'
import type { JobStatus } from '../types/job'

type OcrSummaryPanelProps = {
  jobId: string | null
  status: JobStatus | null
  isContinuingGeneration: boolean
  continueGenerationError: string | null
  onContinueGeneration: () => Promise<void>
}

type ReviewLevel = 'none' | 'warning' | 'error'

const reviewWarningPatterns = [
  /\bdiscrepanz/i,
  /\bincongruen/i,
  /\bincoeren/i,
  /\banomali/i,
  /\berror/i,
  /\bdifferenz/i,
  /\bscostament/i,
  /\bmancant/i,
  /\bassent/i,
  /\bnon\s+(coincide|corrisponde|risulta|torn)/i,
  /\bda\s+(verificare|rivedere|revisionare)/i,
  /\brichiede\s+(verifica|revisione)/i,
  /\bimpossibile\s+verificare/i,
]

const minorCifPatterns = [
  /\bcif\b/i,
  /\bnolo\b/i,
  /\bassicuraz/i,
  /\btrasport/i,
  /\bfreight\b/i,
  /\binsurance\b/i,
]

const reassuringPatterns = [
  /\bnessun[ao]?\s+discrepanz/i,
  /\bsenza\s+discrepanz/i,
  /\bnon\s+(sono\s+state\s+)?rilevat[ei]\s+discrepanz/i,
  /\bnon\s+emergono\s+discrepanz/i,
  /\bnessun[ao]?\s+errore/i,
  /\bdati\s+coerenti/i,
  /\bcalcoli\s+coerenti/i,
]

const reviewCodePattern = /\bcodice[_\s-]*esito\s*[:\-]\s*(ok|warning|error|errore)\b/i

function cleanSectionTitle(line: string) {
  return line
    .trim()
    .replace(/\*/g, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/:$/, '')
    .toUpperCase()
}

function sectionLines(text: string, sectionTitle: string) {
  const knownSections = new Set([
    'DATI GENERALI',
    'DETTAGLIO MERCI E VALORI',
    'ESTRAZIONE DELLE RIGHE TRIBUTARIE',
    'VERIFICA CONTABILE E FISCALE',
    'ESITO FINALE',
  ])
  const lines: string[] = []
  let isInSection = false

  text.split('\n').forEach((line) => {
    const cleanTitle = cleanSectionTitle(line)
    if (cleanTitle === sectionTitle) {
      isInSection = true
      return
    }
    if (isInSection && knownSections.has(cleanTitle)) {
      isInSection = false
      return
    }
    if (isInSection) {
      lines.push(line)
    }
  })

  return lines
}

function hasReviewSignal(line: string) {
  return reviewWarningPatterns.some((pattern) => pattern.test(line))
}

function isReassuring(line: string) {
  return reassuringPatterns.some((pattern) => pattern.test(line))
}

function isMinorCifSignal(line: string) {
  return minorCifPatterns.some((pattern) => pattern.test(line))
}

function getReviewLevelFromCode(text: string): ReviewLevel | null {
  const match = text.match(reviewCodePattern)
  if (!match) {
    return null
  }
  const code = match[1].toLowerCase()
  if (code === 'ok') {
    return 'none'
  }
  if (code === 'warning') {
    return 'warning'
  }
  if (code === 'error' || code === 'errore') {
    return 'error'
  }
  return null
}

function getOcrReviewLevel(text: string): ReviewLevel {
  const coded = getReviewLevelFromCode(text)
  if (coded) {
    return coded
  }

  const finalOutcome = sectionLines(text, 'ESITO FINALE')
  const finalText = finalOutcome.join('\n')

  if (finalText) {
    const hasReassuring = finalOutcome.some((line) => isReassuring(line))
    if (/\berrore\b|\berror\b|‼|❗|!!!/i.test(finalText) && !hasReassuring) {
      return 'error'
    }
    if (/\bwarning\b|\bavvis[oi]\b|\battenzion/i.test(finalText)) {
      return 'warning'
    }

    const finalSignal = finalOutcome.find(
      (line) => hasReviewSignal(line) && !isReassuring(line),
    )
    if (finalSignal) {
      return isMinorCifSignal(finalSignal) ? 'warning' : 'error'
    }
  }

  const hasNonBlockingSignal = text
    .split('\n')
    .some((line) => hasReviewSignal(line) && !isReassuring(line))

  return hasNonBlockingSignal ? 'warning' : 'none'
}

function replaceFinalOutcomeIcon(text: string, reviewLevel: ReviewLevel) {
  if (reviewLevel === 'none') {
    return text
  }
  const icon = reviewLevel === 'error' ? '‼️' : '⚠️'
  return text.replace(/(?:✅|⚠️|‼️)?[ \t]*ESITO FINALE/g, `${icon} ESITO FINALE`)
}

export default function OcrSummaryPanel({
  jobId,
  status,
  isContinuingGeneration,
  continueGenerationError,
  onContinueGeneration,
}: OcrSummaryPanelProps) {
  const [summary, setSummary] = useState<string>('')
  const [summaryReviewLevel, setSummaryReviewLevel] = useState<ReviewLevel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!jobId) {
      return
    }

    let isActive = true
    let intervalId: number | undefined

    const loadSummary = async (isInitial = false) => {
      if (!isActive) {
        return
      }

      if (isInitial) {
        setIsLoading(true)
        setSummary('')
        setSummaryReviewLevel(null)
        setError(null)
        setCopyError(null)
        setHasFetched(false)
      }

      try {
        const data = await getOcrSummary(jobId)
        if (!isActive) {
          return
        }
        const nextText = data.text ?? ''
        const nextReviewLevel = data.reviewLevel ?? null
        if (nextText) {
          setSummary(nextText)
          if (intervalId) {
            window.clearInterval(intervalId)
          }
        }
        setSummaryReviewLevel(nextReviewLevel)
        setError(null)
        setHasFetched(true)
      } catch {
        if (!isActive) {
          return
        }
        if (status === 'failed') {
          setError('OCR non disponibile: il job e fallito.')
          if (intervalId) {
            window.clearInterval(intervalId)
          }
        }
      } finally {
        if (isActive && isInitial) {
          setIsLoading(false)
        }
      }
    }

    if (status !== 'failed') {
      intervalId = window.setInterval(() => loadSummary(false), 3000)
    }
    loadSummary(true)

    return () => {
      isActive = false
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [jobId, status])

  useEffect(() => {
    if (!copied) {
      return
    }
    const timeoutId = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const placeholder = useMemo(() => {
    if (!jobId) {
      return 'Avvia un job per visualizzare il riepilogo OCR.'
    }
    if (status === 'failed') {
      return 'Il riepilogo OCR non e disponibile per un job fallito.'
    }
    if (status !== 'completed') {
      return 'Il riepilogo sara disponibile appena pronto.'
    }
    return 'Nessun contenuto OCR disponibile.'
  }, [jobId, status])

  const handleCopy = async () => {
    const copiedSummary = jobId ? displaySummary : ''
    if (!copiedSummary) {
      return
    }
    try {
      await navigator.clipboard.writeText(copiedSummary)
      setCopied(true)
      setCopyError(null)
    } catch {
      setCopied(false)
      setCopyError('Copia non riuscita. Seleziona e copia il testo manualmente.')
    }
  }

  const visibleSummary = jobId ? summary : ''
  const visibleLoading = Boolean(jobId) && isLoading && !hasFetched
  const visibleError = jobId ? error : null
  const reviewLevel = useMemo(
    () => {
      if (summaryReviewLevel !== null) {
        return summaryReviewLevel
      }
      return visibleSummary ? getOcrReviewLevel(visibleSummary) : 'none'
    },
    [summaryReviewLevel, visibleSummary],
  )
  const displaySummary = replaceFinalOutcomeIcon(visibleSummary, reviewLevel)
  const contentClassName = [
    'ocr-panel__content',
    reviewLevel === 'error' ? 'ocr-panel__content--error' : '',
    reviewLevel === 'warning' ? 'ocr-panel__content--warning' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {reviewLevel === 'warning' && (
        <div className="ocr-banner ocr-warning" role="status">
          <span className="ocr-banner__icon" aria-hidden="true">!</span>
          <div>
            <p className="ocr-banner__title">Warning contabile</p>
            <p className="ocr-banner__text">
              L'analisi OCR ha rilevato possibili differenze compatibili con
              costi di nolo, trasporto o assicurazione CIF.
            </p>
          </div>
        </div>
      )}
      {reviewLevel === 'error' && (
        <div className="ocr-banner ocr-error" role="alert">
          <span className="ocr-banner__icon" aria-hidden="true">!!</span>
          <div>
            <p className="ocr-banner__title">Errore fatale: revisione richiesta</p>
            <p className="ocr-banner__text">
              L'analisi OCR ha rilevato discrepanze significative da verificare
              nella bolla doganale.
            </p>
            {continueGenerationError && (
              <p className="ocr-banner__error">{continueGenerationError}</p>
            )}
          </div>
          {status === 'review_required' && (
            <button
              type="button"
              className="ocr-error__action"
              onClick={onContinueGeneration}
              disabled={isContinuingGeneration}
            >
              {isContinuingGeneration
                ? 'Generazione in corso'
                : 'Procedi con la generazione'}
            </button>
          )}
        </div>
      )}
      <div className="page-card">
        <div className="ocr-panel__header">
          <div>
            <h3>Riepilogo OCR</h3>
            <p className="muted">Testo estratto dal documento.</p>
          </div>
          <button
            type="button"
            className="button-primary"
            onClick={handleCopy}
            disabled={!displaySummary}
          >
            {copied ? 'Copiato' : 'Copia testo'}
          </button>
        </div>
        <div className={contentClassName}>
          {visibleLoading && <p className="muted">Caricamento riepilogo...</p>}
          {visibleError && <p className="error-text">{visibleError}</p>}
          {copyError && <p className="error-text">{copyError}</p>}
          {!visibleLoading && !visibleError && (
            <>
              {displaySummary ? (
                <pre>{displaySummary}</pre>
              ) : (
                <div className="empty-state">
                  <p className="empty-state__title">Riepilogo non ancora disponibile</p>
                  <p className="muted">{placeholder}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
