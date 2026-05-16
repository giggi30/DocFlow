export type StartJobResponse = {
  jobId: string
}

export type JobStatus =
  | 'queued'
  | 'running'
  | 'review_required'
  | 'completed'
  | 'failed'

export type JobStatusResponse = {
  jobId: string
  status: JobStatus
  step?: string | null
  error?: string | null
}

export type ContinueGenerationResponse = {
  jobId: string
  status: 'running'
}
