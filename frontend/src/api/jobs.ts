import type {
  ContinueGenerationResponse,
  JobStatusResponse,
  StartJobResponse,
} from '../types/job'
import type { JobArtifact } from '../types/artifacts'
import type { OcrSummaryResponse } from '../types/ocr'
import { fetchWithAuth } from './client'

export async function startJob(fileId: string): Promise<StartJobResponse> {
  const response = await fetchWithAuth('/jobs/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId }),
  })

  if (!response.ok) {
    throw new Error('Start job failed')
  }

  const data = (await response.json()) as StartJobResponse
  if (!data.jobId) {
    throw new Error('Missing jobId')
  }

  return data
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetchWithAuth(`/jobs/${jobId}`)

  if (!response.ok) {
    throw new Error('Fetch job status failed')
  }

  const data = (await response.json()) as JobStatusResponse
  if (!data.status) {
    throw new Error('Missing job status')
  }

  return data
}

export async function getOcrSummary(jobId: string): Promise<OcrSummaryResponse> {
  const response = await fetchWithAuth(`/jobs/${jobId}/ocr-summary`)

  if (!response.ok) {
    throw new Error('Fetch OCR summary failed')
  }

  const data = (await response.json()) as OcrSummaryResponse
  return data
}

export async function continueDocumentGeneration(
  jobId: string,
): Promise<ContinueGenerationResponse> {
  const response = await fetchWithAuth(`/jobs/${jobId}/continue-generation`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Continue document generation failed')
  }

  return (await response.json()) as ContinueGenerationResponse
}

export async function getJobArtifacts(jobId: string): Promise<JobArtifact[]> {
  const response = await fetchWithAuth(`/jobs/${jobId}/artifacts`)

  if (!response.ok) {
    throw new Error('Fetch job artifacts failed')
  }

  const data = (await response.json()) as JobArtifact[]
  return data
}
