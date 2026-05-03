import type { ArchiveDocument } from '../types/documents'

export async function getDocuments(): Promise<ArchiveDocument[]> {
  const response = await fetch('/documents')

  if (!response.ok) {
    throw new Error('Fetch documents failed')
  }

  const data = (await response.json()) as unknown
  if (!Array.isArray(data)) {
    throw new Error('Invalid documents response')
  }

  return data as ArchiveDocument[]
}
