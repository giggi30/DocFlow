import { useEffect, useMemo, useState } from 'react'
import { getOcrSummary } from '../api/jobs'
import type { JobStatus } from '../types/job'

type OcrSummaryPanelProps = {
  jobId: string | null
  status: JobStatus | null
}

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

const reassuringPatterns = [
  /\bnessun[ao]?\s+discrepanz/i,
  /\bsenza\s+discrepanz/i,
  /\bnon\s+(sono\s+state\s+)?rilevat[ei]\s+discrepanz/i,
  /\bnon\s+emergono\s+discrepanz/i,
  /\bdati\s+coerenti/i,
  /\bcalcoli\s+coerenti/i,
]

function hasHumanReviewWarning(text: string) {
  return text.split('\n').some((line) => {
    const hasWarning = reviewWarningPatterns.some((pattern) => pattern.test(line))
    const isReassuring = reassuringPatterns.some((pattern) => pattern.test(line))
    return hasWarning && !isReassuring
  })
}

function replaceFinalOutcomeIcon(text: string, hasWarning: boolean) {
  if (!hasWarning) {
    return text
  }
  return text.replace(/✅\s*ESITO FINALE/g, '⚠️ ESITO FINALE')
}

export default function OcrSummaryPanel({ jobId, status }: OcrSummaryPanelProps) {
  const [summary, setSummary] = useState<string>('')
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
        if (nextText) {
          setSummary(nextText)
          if (intervalId) {
            window.clearInterval(intervalId)
          }
        }
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
  const showReviewWarning = useMemo(
    () => Boolean(visibleSummary && hasHumanReviewWarning(visibleSummary)),
    [visibleSummary],
  )
  const displaySummary = replaceFinalOutcomeIcon(visibleSummary, showReviewWarning)

  return (
    <>
      {showReviewWarning && (
        <div className="ocr-warning" role="alert">
          <span className="ocr-warning__icon" aria-hidden="true">!</span>
          <div>
            <p className="ocr-warning__title">Revisione umana richiesta</p>
            <p className="ocr-warning__text">
              L'analisi OCR ha rilevato possibili discrepanze o informazioni
              da verificare nella bolla doganale.
            </p>
          </div>
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
        <div className="ocr-panel__content">
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
