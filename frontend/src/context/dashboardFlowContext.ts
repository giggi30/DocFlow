import { createContext } from 'react'
import type { JobStatusResponse } from '../types/job'

export type DashboardFlowContextValue = {
  fileId: string | null
  jobId: string | null
  jobStatus: JobStatusResponse | null
  isPolling: boolean
  pollingError: string | null
  isStarting: boolean
  jobError: string | null
  analyzePdf: (file: File) => Promise<void>
  continueGeneration: () => Promise<void>
  isContinuingGeneration: boolean
  continueGenerationError: string | null
}

export const DashboardFlowContext =
  createContext<DashboardFlowContextValue | null>(null)
