import { useEffect, useState } from 'react'
import { getJobStatus } from '../api/jobs'
import type { JobStatusResponse } from '../types/job'

type JobPollingState = {
  data: JobStatusResponse | null
  isLoading: boolean
  error: string | null
}

const TERMINAL_STATUSES = new Set(['review_required', 'completed', 'failed'])

export default function useJobPolling(
  jobId: string | null,
  refreshKey = 0,
): JobPollingState {
  const [data, setData] = useState<JobStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) {
      return
    }

    let isActive = true
    setIsLoading(true)
    const intervalId = window.setInterval(() => {
      poll()
    }, 3000)

    const poll = async () => {
      try {
        const next = await getJobStatus(jobId)
        if (!isActive) {
          return
        }
        setData(next)
        setError(null)
        setIsLoading(false)

        if (TERMINAL_STATUSES.has(next.status)) {
          window.clearInterval(intervalId)
        }
      } catch {
        if (!isActive) {
          return
        }
        setError('Errore nel recupero dello stato job.')
        setIsLoading(false)
        window.clearInterval(intervalId)
      }
    }

    poll()

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [jobId, refreshKey])

  if (!jobId) {
    return { data: null, isLoading: false, error: null }
  }

  const currentData = data?.jobId === jobId ? data : null
  return { data: currentData, isLoading: isLoading || !currentData, error }
}
