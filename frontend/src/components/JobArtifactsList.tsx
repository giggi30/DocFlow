import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../api/client'
import { getJobArtifacts } from '../api/jobs'
import DocumentPreviewPanel from './DocumentPreviewPanel'
import type { JobStatus } from '../types/job'
import type { JobArtifact } from '../types/artifacts'

type JobArtifactsListProps = {
  jobId: string | null
  status: JobStatus | null
}

export default function JobArtifactsList({ jobId, status }: JobArtifactsListProps) {
  const [artifacts, setArtifacts] = useState<JobArtifact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [previewArtifact, setPreviewArtifact] = useState<JobArtifact | null>(
    null,
  )

  useEffect(() => {
    if (!jobId || status !== 'completed') {
      return
    }

    let isActive = true
    const loadArtifacts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getJobArtifacts(jobId)
        if (!isActive) {
          return
        }
        setArtifacts(data)
        setPreviewArtifact(null)
      } catch {
        if (!isActive) {
          return
        }
        setError('Impossibile recuperare i documenti generati.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadArtifacts()

    return () => {
      isActive = false
    }
  }, [jobId, status])

  const handleDownload = async (artifact: JobArtifact) => {
    setDownloadError(null)
    try {
      const response = await fetchWithAuth(artifact.downloadUrl)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = artifact.name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setDownloadError('Download non riuscito. Riprova.')
    }
  }

  const hasCompletedJob = Boolean(jobId && status === 'completed')
  const visibleArtifacts = hasCompletedJob ? artifacts : []
  const visibleError = hasCompletedJob ? error : null
  const visibleDownloadError = hasCompletedJob ? downloadError : null
  const visibleLoading = hasCompletedJob && isLoading
  const emptyMessage = (() => {
    if (!jobId) {
      return 'Avvia un job per vedere i documenti generati.'
    }
    if (status === 'failed') {
      return 'Nessun documento generato: il job e fallito.'
    }
    if (status === 'review_required') {
      return 'Generazione sospesa per errore fatale OCR. Procedi dal banner rosso dopo la revisione.'
    }
    if (status !== 'completed') {
      return "I documenti saranno disponibili al termine dell'elaborazione."
    }
    return 'Nessun documento disponibile per questo job.'
  })()

  return (
    <div className="page-card">
      <div className="artifacts-header">
        <div>
          <h3>Documenti generati</h3>
          <p className="muted">Disponibili quando il job e completato.</p>
        </div>
      </div>
      {visibleLoading && <p className="muted">Caricamento documenti...</p>}
      {visibleError && <p className="error-text">{visibleError}</p>}
      {visibleDownloadError && (
        <p className="error-text">{visibleDownloadError}</p>
      )}
      {!visibleLoading && !visibleError && (
        <div className="artifacts-list">
          {visibleArtifacts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__title">Documenti non disponibili</p>
              <p className="muted">{emptyMessage}</p>
            </div>
          ) : (
            visibleArtifacts.map((artifact) => (
              <div key={artifact.id} className="artifacts-item">
                <div>
                  <p className="artifacts-name">{artifact.name}</p>
                  <p className="muted">{artifact.type}</p>
                </div>
                <div className="artifacts-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setPreviewArtifact(artifact)}
                  >
                    Anteprima
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => handleDownload(artifact)}
                  >
                    Scarica
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {previewArtifact && (
        <div className="preview-modal" role="dialog" aria-modal="true">
          <div
            className="preview-modal__backdrop"
            onClick={() => setPreviewArtifact(null)}
          />
          <div className="preview-modal__content">
            <button
              type="button"
              className="preview-modal__close"
              onClick={() => setPreviewArtifact(null)}
              aria-label="Chiudi anteprima"
            >
              Chiudi
            </button>
            <DocumentPreviewPanel document={previewArtifact} />
          </div>
        </div>
      )}
    </div>
  )
}
