import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../api/client'

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
  document: currentDocument,
}: DocumentPreviewPanelProps) {
  const [textContent, setTextContent] = useState('')
  const [isLoadingText, setIsLoadingText] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)
  const [binaryPreviewUrl, setBinaryPreviewUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    const previewUrl = currentDocument?.previewUrl
    if (!currentDocument || !previewUrl || !canPreviewText(currentDocument)) {
      setTextContent('')
      setTextError(null)
      setIsLoadingText(false)
      return
    }

    let isActive = true
    const controller = new AbortController()

    const loadText = async () => {
      setIsLoadingText(true)
      setTextError(null)

      try {
        const response = await fetchWithAuth(previewUrl, {
          signal: controller.signal,
        })
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
      controller.abort()
    }
  }, [currentDocument])

  const hasPreview = Boolean(currentDocument?.previewUrl)
  const showPdf =
    hasPreview && currentDocument && canPreviewPdf(currentDocument)
  const showImage =
    hasPreview && currentDocument && canPreviewImage(currentDocument)
  const showText =
    hasPreview && currentDocument && canPreviewText(currentDocument)
  const showOffice =
    hasPreview && currentDocument && canPreviewOffice(currentDocument)
  const showBinaryPreview = showPdf || showImage || showOffice

  useEffect(() => {
    if (!currentDocument || !currentDocument.previewUrl || !showBinaryPreview) {
      setPreviewError(null)
      setIsLoadingPreview(false)
      setBinaryPreviewUrl((current) => {
        if (current) {
          window.URL.revokeObjectURL(current)
        }
        return null
      })
      return
    }

    let isActive = true
    const controller = new AbortController()

    setIsLoadingPreview(true)
    setPreviewError(null)
    setBinaryPreviewUrl((current) => {
      if (current) {
        window.URL.revokeObjectURL(current)
      }
      return null
    })

    const loadBinary = async () => {
      try {
        const response = await fetchWithAuth(currentDocument.previewUrl!, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Preview failed')
        }
        const blob = await response.blob()
        const objectUrl = window.URL.createObjectURL(blob)
        if (!isActive) {
          window.URL.revokeObjectURL(objectUrl)
          return
        }
        setBinaryPreviewUrl(objectUrl)
      } catch {
        if (isActive) {
          setPreviewError('Anteprima non disponibile.')
        }
      } finally {
        if (isActive) {
          setIsLoadingPreview(false)
        }
      }
    }

    loadBinary()

    return () => {
      isActive = false
      controller.abort()
      setBinaryPreviewUrl((current) => {
        if (current) {
          window.URL.revokeObjectURL(current)
        }
        return null
      })
    }
  }, [currentDocument, showBinaryPreview])

  useEffect(() => {
    setDownloadError(null)
  }, [currentDocument])

  const handleDownload = async () => {
    if (!currentDocument) {
      return
    }

    setIsDownloading(true)
    setDownloadError(null)

    try {
      const response = await fetchWithAuth(currentDocument.downloadUrl)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = currentDocument.name
      window.document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setDownloadError('Download non riuscito. Riprova.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!currentDocument) {
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
  const hasBinaryPreview = Boolean(binaryPreviewUrl)

  return (
    <section className="document-preview">
      <div className="document-preview__header">
        <div>
          <h3>Preview documento</h3>
          <p className="document-preview__name">{currentDocument.name}</p>
          <p className="muted">{currentDocument.mimeType}</p>
          {downloadError && <p className="error-text">{downloadError}</p>}
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? 'Download...' : 'Scarica'}
        </button>
      </div>

      <div className="document-preview__body">
        {showBinaryPreview && isLoadingPreview && !hasBinaryPreview && (
          <div className="document-preview__fallback">
            <p className="muted">Caricamento anteprima...</p>
          </div>
        )}
        {showBinaryPreview && previewError && (
          <div className="document-preview__fallback">
            <p className="archive-empty__title">Anteprima non disponibile</p>
            <p className="error-text">{previewError}</p>
          </div>
        )}
        {showPdf && hasBinaryPreview && (
          <object
            className="document-preview__pdf"
            data={binaryPreviewUrl ?? undefined}
            type="application/pdf"
          >
            <iframe
              className="document-preview__pdf"
              src={binaryPreviewUrl ?? undefined}
              title={`Preview ${currentDocument.name}`}
            />
          </object>
        )}

        {showImage && hasBinaryPreview && (
          <img
            className="document-preview__image"
            src={binaryPreviewUrl ?? undefined}
            alt={currentDocument.name}
          />
        )}

        {showText && (
          <div className="document-preview__text">
            {isLoadingText && <p className="muted">Caricamento testo...</p>}
            {textError && <p className="error-text">{textError}</p>}
            {!isLoadingText && !textError && <pre>{textContent}</pre>}
          </div>
        )}

        {showOffice && hasBinaryPreview && (
          <iframe
            className="document-preview__office"
            src={binaryPreviewUrl ?? undefined}
            title={`Preview ${currentDocument.name}`}
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
