export type ArchiveDocument = {
  id: string
  name: string
  type: string
  mimeType: string
  date: string
  source: string
  jobId: string
  previewUrl?: string | null
  downloadUrl: string
}
