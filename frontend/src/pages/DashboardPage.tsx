import JobArtifactsList from '../components/JobArtifactsList'
import JobStatusCard from '../components/JobStatusCard'
import OcrSummaryPanel from '../components/OcrSummaryPanel'
import UploadDropzone from '../components/UploadDropzone'
import useDashboardFlow from '../hooks/useDashboardFlow'

export default function DashboardPage() {
  const {
    fileId,
    jobId,
    jobStatus,
    isPolling,
    pollingError,
    isStarting,
    jobError,
    analyzePdf,
  } = useDashboardFlow()

  return (
    <section className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Carica una bolla doganale e avvia il flusso.</p>
      </div>
      <div className="page-card">
        <h3>Upload PDF</h3>
        <p className="muted">
          Seleziona una bolla doganale PDF: il sistema la carica e avvia
          subito l analisi.
        </p>
        <UploadDropzone
          isAnalyzing={isStarting}
          error={jobError}
          onAnalyze={analyzePdf}
        />
        {(fileId || jobId) && (
          <div className="dashboard-meta">
            <div>
              <span className="status-card__label">fileId</span>
              <span className="status-card__value">{fileId ?? '—'}</span>
            </div>
            <div>
              <span className="status-card__label">jobId</span>
              <span className="status-card__value">{jobId ?? '—'}</span>
            </div>
          </div>
        )}
      </div>
      <JobStatusCard
        jobId={jobId}
        status={jobStatus}
        isLoading={isPolling}
        error={pollingError}
      />
      <div className="page-card results-card">
        <div className="results-card__header">
          <h3>Risultati</h3>
          <p className="muted">
            Riepilogo OCR e documenti generati vengono mostrati appena pronti.
          </p>
        </div>
        <OcrSummaryPanel jobId={jobId} status={jobStatus?.status ?? null} />
        <JobArtifactsList jobId={jobId} status={jobStatus?.status ?? null} />
      </div>
    </section>
  )
}
