import type { JobStatus, JobStatusResponse } from '../types/job'

type JobStatusCardProps = {
  jobId: string | null
  status: JobStatusResponse | null
  isLoading: boolean
  error: string | null
}

const statusLabels: Record<JobStatus, string> = {
  queued: 'In coda',
  running: 'In esecuzione',
  completed: 'Completato',
  failed: 'Errore',
}

const statusClasses: Record<JobStatus, string> = {
  queued: 'status-pill status-pill--queued',
  running: 'status-pill status-pill--running',
  completed: 'status-pill status-pill--success',
  failed: 'status-pill status-pill--error',
}

export default function JobStatusCard({ jobId, status, isLoading, error }: JobStatusCardProps) {
  const currentStatus = status?.status
  const statusLabel = currentStatus ? statusLabels[currentStatus] : 'In attesa'
  const statusClass = currentStatus ? statusClasses[currentStatus] : 'status-pill'
  const stepLabel = status?.step ?? '—'
  const statusMessage = (() => {
    if (!jobId) {
      return 'Avvia un job per monitorare coda, avanzamento e risultato.'
    }
    if (error) {
      return 'Non riesco ad aggiornare lo stato. Verifica che il backend sia attivo.'
    }
    if (currentStatus === 'completed') {
      return 'Elaborazione completata. I documenti sono disponibili qui sotto.'
    }
    if (currentStatus === 'failed') {
      return 'Elaborazione interrotta. Leggi il dettaglio errore qui sotto.'
    }
    return 'Elaborazione in corso. Puoi cambiare pagina: il polling resta attivo.'
  })()

  return (
    <div className="page-card">
      <div className="status-card__header">
        <div>
          <h3>Stato job</h3>
          <p className="muted">Aggiornato ogni 3 secondi finche non termina.</p>
        </div>
        <span className={statusClass}>{isLoading ? 'Caricamento' : statusLabel}</span>
      </div>
      <div className="status-card__grid">
        <div>
          <span className="status-card__label">Step</span>
          <span className="status-card__value">{stepLabel}</span>
        </div>
        <div>
          <span className="status-card__label">Job</span>
          <span className="status-card__value">{jobId ?? '—'}</span>
        </div>
      </div>
      <p className={error || status?.error ? 'error-text' : 'muted'}>
        {statusMessage}
      </p>
      {error && <p className="error-text">{error}</p>}
      {status?.error && <p className="error-text">{status.error}</p>}
    </div>
  )
}
