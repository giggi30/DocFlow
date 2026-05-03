export type StartJobResponse = {
  jobId: string
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed'

export type JobStatusResponse = {
  jobId: string
  status: JobStatus
  step?: string | null
  error?: string | null
}
