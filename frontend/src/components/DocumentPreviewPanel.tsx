import { useEffect, useState } from 'react'

export type PreviewableDocument = {
  name: string
  type: string
  mimeType: string
  previewUrl?: string | null
  downloadUrl: string
}

type DocumentPreviewPanelProps = {
  document: PreviewableDocument | null
}

function canPreviewText(document: PreviewableDocument) {
  return document.type === 'text' || document.mimeType.startsWith('text/')
}

function canPreviewPdf(document: PreviewableDocument) {
  return document.type === 'pdf' || document.mimeType === 'application/pdf'
}

function canPreviewImage(document: PreviewableDocument) {
  return document.type === 'image' || document.mimeType.startsWith('image/')
}

function canPreviewOffice(document: PreviewableDocument) {
  return document.type === 'excel' || document.type === 'word'
}

export default function DocumentPreviewPanel({
  document,
}: DocumentPreviewPanelProps) {
  const [textContent, setTextContent] = useState('')
  const [isLoadingText, setIsLoadingText] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  useEffect(() => {
    const previewUrl = document?.previewUrl
    if (!document || !previewUrl || !canPreviewText(document)) {
      return
    }

    let isActive = true

    const loadText = async () => {
      setIsLoadingText(true)
      setTextError(null)

      try {
        const response = await fetch(previewUrl)
        if (!response.ok) {
          throw new Error('Text preview failed')
        }

        const text = await response.text()
        if (isActive) {
          setTextContent(text)
        }
      } catch {
        if (isActive) {
          setTextContent('')
          setTextError('Anteprima testo non disponibile.')
        }
      } finally {
        if (isActive) {
          setIsLoadingText(false)
        }
      }
    }

    loadText()

    return () => {
      isActive = false
    }
  }, [document])

  if (!document) {
    return (
      <section className="document-preview">
        <div className="document-preview__header">
          <div>
            <h3>Preview documento</h3>
            <p className="muted">Seleziona un documento per aprirlo qui.</p>
          </div>
        </div>
      </section>
    )
  }

  const hasPreview = Boolean(document.previewUrl)
  const showPdf = hasPreview && canPreviewPdf(document)
  const showImage = hasPreview && canPreviewImage(document)
  const showText = hasPreview && canPreviewText(document)
  const showOffice = hasPreview && canPreviewOffice(document)

  return (
    <section className="document-preview">
      <div className="document-preview__header">
        <div>
          <h3>Preview documento</h3>
          <p className="document-preview__name">{document.name}</p>
          <p className="muted">{document.mimeType}</p>
        </div>
        <a
          className="button-secondary"
          href={document.downloadUrl}
          download={document.name}
        >
          Scarica
        </a>
      </div>

      <div className="document-preview__body">
        {showPdf && (
          <object
            className="document-preview__pdf"
            data={document.previewUrl ?? undefined}
            type="application/pdf"
          >
            <iframe
              className="document-preview__pdf"
              src={document.previewUrl ?? undefined}
              title={`Preview ${document.name}`}
            />
          </object>
        )}

        {showImage && (
          <img
            className="document-preview__image"
            src={document.previewUrl ?? undefined}
            alt={document.name}
          />
        )}

        {showText && (
          <div className="document-preview__text">
            {isLoadingText && <p className="muted">Caricamento testo...</p>}
            {textError && <p className="error-text">{textError}</p>}
            {!isLoadingText && !textError && <pre>{textContent}</pre>}
          </div>
        )}

        {showOffice && (
          <iframe
            className="document-preview__office"
            src={document.previewUrl ?? undefined}
            title={`Preview ${document.name}`}
          />
        )}

        {!showPdf && !showImage && !showText && !showOffice && (
          <div className="document-preview__fallback">
            <p className="archive-empty__title">Anteprima non disponibile</p>
            <p className="muted">
              Questo formato non puo essere aperto direttamente nell'app.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
