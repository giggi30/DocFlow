import { useId, useState, useEffect } from 'react'

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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
  const [pdfObjectURL, setPdfObjectURL] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    if (!selectedFile) {
      setPdfObjectURL(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setPdfObjectURL(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [selectedFile])

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

  const handleRemoveFile = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    setSelectedFile(null)
    setStatus('idle')
    setErrorMessage(null)
  }

  const handleOpenPreview = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
  }

  const dropzoneClassName = isDragActive ? 'dropzone dropzone--active' : 'dropzone'
  const canAnalyze =
    Boolean(selectedFile) && !isAnalyzing && (status === 'ready' || status === 'error')
  const analyzeLabel =
    isAnalyzing
      ? 'Analisi in corso...'
      : status === 'success'
        ? 'Analisi avviata'
        : 'Analizza PDF'

  return (
    <div className="upload-panel">
      <input
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
      />

      {selectedFile ? (
        <div className="file-preview-card">
          <div className="file-preview-card__left">
            <div
              className="file-preview-card__thumbnail-wrapper"
              onClick={handleOpenPreview}
              title="Clicca per ingrandire l'anteprima"
            >
              {pdfObjectURL ? (
                <>
                  <iframe
                    src={`${pdfObjectURL}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="file-preview-card__thumbnail-iframe"
                    title="PDF Thumbnail Preview"
                    scrolling="no"
                  />
                  <div className="file-preview-card__thumbnail-blocker" />
                </>
              ) : (
                <div className="file-preview-card__thumbnail-fallback">
                  <span className="file-preview-card__thumbnail-fallback-icon">📄</span>
                  <span className="file-preview-card__thumbnail-fallback-text">PDF</span>
                </div>
              )}
              <div className="file-preview-card__thumbnail-overlay">
                <div className="file-preview-card__zoom-icon">🔍</div>
              </div>
            </div>
            <div className="file-preview-card__details">
              <span className="file-preview-card__name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <div className="file-preview-card__meta">
                <span className="file-preview-card__size">
                  {formatFileSize(selectedFile.size)}
                </span>
                <span className={statusClasses[status]}>{statusLabels[status]}</span>
              </div>
              <div className="file-preview-card__actions">
                <button
                  type="button"
                  className="button-link-danger"
                  onClick={handleRemoveFile}
                  disabled={isAnalyzing}
                >
                  Rimuovi
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={handleOpenPreview}
          >
            Ingrandisci a tutto schermo
          </button>
        </div>
      ) : (
        <>
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
            <span className="file-name">Nessun file selezionato</span>
            <span className={statusClasses[status]}>{statusLabels[status]}</span>
          </div>
        </>
      )}

      {errorMessage && <p className="error-text">{errorMessage}</p>}
      {error && <p className="error-text">{error}</p>}
      {status === 'success' && (
        <p className="success-text">
          Job avviato. Puoi seguire l'avanzamento qui sotto.
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

      {isPreviewOpen && selectedFile && pdfObjectURL && (
        <div className="preview-modal" role="dialog" aria-modal="true">
          <div
            className="preview-modal__backdrop"
            onClick={handleClosePreview}
          />
          <div className="preview-modal__content">
            <button
              type="button"
              className="preview-modal__close"
              onClick={handleClosePreview}
              aria-label="Chiudi anteprima"
            >
              Chiudi
            </button>
            <section className="document-preview" style={{ height: '100%', border: 'none', padding: 0 }}>
              <div className="document-preview__header" style={{ padding: '20px 24px' }}>
                <div>
                  <h3>Anteprima documento</h3>
                  <p className="document-preview__name">{selectedFile.name}</p>
                  <p className="muted">{selectedFile.type || 'application/pdf'}</p>
                </div>
              </div>
              <div className="document-preview__body" style={{ flex: 1, margin: '0 24px 24px', height: 'calc(100% - 130px)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                <object
                  className="document-preview__pdf"
                  data={pdfObjectURL}
                  type="application/pdf"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                >
                  <iframe
                    className="document-preview__pdf"
                    src={pdfObjectURL}
                    title={`Anteprima ${selectedFile.name}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </object>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

