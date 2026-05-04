import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDocuments } from '../api/documents'
import DocumentPreviewPanel from '../components/DocumentPreviewPanel'
import type { ArchiveDocument } from '../types/documents'

export default function ArchivePage() {
  const [documents, setDocuments] = useState<ArchiveDocument[]>([])
  const [selectedType, setSelectedType] = useState('all')
  const [selectedDocument, setSelectedDocument] =
    useState<ArchiveDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(() => {
    let isActive = true

    const fetchDocuments = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getDocuments()
        if (!isActive) {
          return
        }

        setDocuments(data)
        setSelectedDocument((current) => {
          if (!current) {
            return null
          }

          return data.find((document) => document.id === current.id) ?? null
        })
      } catch {
        if (!isActive) {
          return
        }

        setDocuments([])
        setSelectedDocument(null)
        setError(
          "Impossibile recuperare l'archivio documenti. Verifica che il backend sia attivo.",
        )
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    fetchDocuments()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => loadDocuments(), [loadDocuments])

  const documentTypes = useMemo(() => {
    return Array.from(new Set(documents.map((document) => document.type))).sort()
  }, [documents])

  const filteredDocuments = useMemo(() => {
    if (selectedType === 'all') {
      return documents
    }

    return documents.filter((document) => document.type === selectedType)
  }, [documents, selectedType])

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    setSelectedDocument(null)
  }

  return (
    <section className="page">
      <div className="page-header">
        <h2>Archivio documenti</h2>
        <p>Visualizza tutti i documenti generati e storici.</p>
      </div>
      <div className="page-card">
        <div className="archive-toolbar">
          <div>
            <h3>Documenti disponibili</h3>
            <p className="muted">
              Filtra i documenti generati dai job completati.
            </p>
          </div>
          <div
            className="archive-filters"
            aria-label="Filtra per tipo documento"
          >
            <button
              type="button"
              className={
                selectedType === 'all'
                  ? 'archive-filter archive-filter--active'
                  : 'archive-filter'
              }
              onClick={() => handleTypeChange('all')}
            >
              Tutti
            </button>
            {documentTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={
                  selectedType === type
                    ? 'archive-filter archive-filter--active'
                    : 'archive-filter'
                }
                onClick={() => handleTypeChange(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="empty-state">
            <p className="empty-state__title">Caricamento archivio</p>
            <p className="muted">Recupero dei documenti generati in corso...</p>
          </div>
        )}
        {error && (
          <div className="empty-state empty-state--error">
            <p className="empty-state__title">Archivio non disponibile</p>
            <p className="error-text">{error}</p>
            <button
              type="button"
              className="button-secondary"
              onClick={loadDocuments}
            >
              Riprova
            </button>
          </div>
        )}
        {!isLoading && !error && documents.length === 0 && (
          <div className="archive-empty">
            <p className="archive-empty__title">Nessun documento in archivio</p>
            <p className="muted">
              I documenti compariranno qui quando un job sara completato con
              successo.
            </p>
          </div>
        )}
        {!isLoading && !error && documents.length > 0 && (
          <div className="archive-layout">
            <div className="archive-table" role="table">
              <div className="archive-row archive-row--head" role="row">
                <span role="columnheader">Nome</span>
                <span role="columnheader">Tipo</span>
                <span role="columnheader">Data e ora</span>
              </div>
              {filteredDocuments.length === 0 ? (
                <div className="archive-empty archive-empty--compact">
                  <p className="archive-empty__title">Nessun risultato</p>
                  <p className="muted">
                    Non ci sono documenti per il filtro selezionato.
                  </p>
                </div>
              ) : (
                filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    className={
                      selectedDocument?.id === document.id
                        ? 'archive-row archive-row--item archive-row--selected'
                        : 'archive-row archive-row--item'
                    }
                    onClick={() => setSelectedDocument(document)}
                    role="row"
                  >
                    <span className="archive-name" data-label="Nome" role="cell">
                      {document.name}
                    </span>
                    <span data-label="Tipo" role="cell">
                      {document.type}
                    </span>
                    <span data-label="Data e ora" role="cell">
                      {document.date}
                    </span>
                  </button>
                ))
              )}
            </div>

            <aside className="archive-detail" aria-label="Documento selezionato">
              <div className="archive-detail__meta">
                <h3>Documento selezionato</h3>
                {selectedDocument ? (
                  <dl className="archive-detail__list">
                    <div>
                      <dt>Nome</dt>
                      <dd>{selectedDocument.name}</dd>
                    </div>
                    <div>
                      <dt>Tipo</dt>
                      <dd>{selectedDocument.type}</dd>
                    </div>
                    <div>
                      <dt>Data e ora</dt>
                      <dd>{selectedDocument.date}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="muted">
                    Seleziona un documento dalla lista per visualizzarne i
                    dettagli.
                  </p>
                )}
              </div>
              <DocumentPreviewPanel document={selectedDocument} />
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}
