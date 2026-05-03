import { useId, useState } from 'react'

type UploadStatus = 'idle' | 'ready' | 'analyzing' | 'success' | 'error'

type UploadDropzoneProps = {
  isAnalyzing: boolean
  error: string | null
  onAnalyze: (file: File) => Promise<void>
}

const statusLabels: Record<UploadStatus, string> = {
  idle: 'In attesa',
  ready: 'Pronto',
  analyzing: 'Analisi',
  success: 'Avviato',
  error: 'Errore',
}

const statusClasses: Record<UploadStatus, string> = {
  idle: 'status-pill',
  ready: 'status-pill status-pill--ready',
  analyzing: 'status-pill status-pill--uploading',
  success: 'status-pill status-pill--success',
  error: 'status-pill status-pill--error',
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export default function UploadDropzone({
  isAnalyzing,
  error,
  onAnalyze,
}: UploadDropzoneProps) {
  const inputId = useId()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleFileSelection = (file: File) => {
    if (!isPdfFile(file)) {
      setSelectedFile(null)
      setStatus('error')
      setErrorMessage('Formato non supportato. Seleziona un file PDF.')
      return
    }

    setSelectedFile(file)
    setStatus('ready')
    setErrorMessage(null)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
    event.currentTarget.value = ''
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragActive(false)

    if (isAnalyzing) {
      return
    }

    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      return
    }

    setStatus('analyzing')
    setErrorMessage(null)

    try {
      await onAnalyze(selectedFile)
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMessage('Analisi non riuscita. Riprova.')
    }
  }

  const dropzoneClassName = isDragActive ? 'dropzone dropzone--active' : 'dropzone'
  const canAnalyze =
    Boolean(selectedFile) && !isAnalyzing && (status === 'ready' || status === 'error')
  const analyzeLabel =
    isAnalyzing
      ? 'Analisi in corso...'
      : status === 'success'
        ? 'Analisi avviata'
        : 'Carica e analizza PDF'

  return (
    <div className="upload-panel">
      <input
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
      />
      <label
        htmlFor={inputId}
        className={dropzoneClassName}
        aria-disabled={isAnalyzing}
        onDragOver={(event) => {
          event.preventDefault()
          if (isAnalyzing) {
            return
          }
          setIsDragActive(true)
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
      >
        <p className="dropzone__title">Trascina qui il PDF</p>
        <p className="dropzone__hint">Oppure clicca per selezionare</p>
      </label>
      <div className="file-meta">
        <span className="file-name">
          {selectedFile ? selectedFile.name : 'Nessun file selezionato'}
        </span>
        <span className={statusClasses[status]}>{statusLabels[status]}</span>
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      {error && <p className="error-text">{error}</p>}
      {status === 'success' && (
        <p className="success-text">
          Job avviato. Puoi seguire l avanzamento qui sotto.
        </p>
      )}
      <div className="upload-actions">
        <button
          type="button"
          className="button-primary"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
        >
          {analyzeLabel}
        </button>
      </div>
    </div>
  )
}
