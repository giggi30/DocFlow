import type { UploadResponse } from '../types/upload'

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const data = (await response.json()) as UploadResponse
  if (!data.fileId) {
    throw new Error('Missing fileId')
  }

  return data
}
