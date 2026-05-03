export type JobArtifact = {
  id: string
  name: string
  type: string
  mimeType: string
  previewUrl?: string | null
  downloadUrl: string
}
