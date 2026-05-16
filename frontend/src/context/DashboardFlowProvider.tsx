import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { continueDocumentGeneration, startJob } from '../api/jobs'
import { uploadPdf } from '../api/upload'
import { DashboardFlowContext } from './dashboardFlowContext'
import useJobPolling from '../hooks/useJobPolling'

type DashboardFlowProviderProps = {
  children: ReactNode
}

export function DashboardFlowProvider({
  children,
}: DashboardFlowProviderProps) {
  const [fileId, setFileId] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isContinuingGeneration, setIsContinuingGeneration] = useState(false)
  const [continueGenerationError, setContinueGenerationError] = useState<string | null>(null)
  const [pollingRefreshKey, setPollingRefreshKey] = useState(0)
  const [jobError, setJobError] = useState<string | null>(null)
  const { data: jobStatus, isLoading: isPolling, error: pollingError } =
    useJobPolling(jobId, pollingRefreshKey)

  const analyzePdf = useCallback(async (file: File) => {
    setIsStarting(true)
    setJobError(null)
    setContinueGenerationError(null)
    setFileId(null)
    setJobId(null)

    try {
      const { fileId: nextFileId } = await uploadPdf(file)
      setFileId(nextFileId)
      const { jobId: nextJobId } = await startJob(nextFileId)
      setJobId(nextJobId)
    } catch {
      setFileId(null)
      setJobId(null)
      setJobError('Analisi non riuscita. Verifica il PDF e riprova.')
    } finally {
      setIsStarting(false)
    }
  }, [])

  const continueGeneration = useCallback(async () => {
    if (!jobId) {
      return
    }

    setIsContinuingGeneration(true)
    setContinueGenerationError(null)

    try {
      await continueDocumentGeneration(jobId)
      setPollingRefreshKey((current) => current + 1)
    } catch {
      setContinueGenerationError('Generazione documenti non avviata. Riprova.')
    } finally {
      setIsContinuingGeneration(false)
    }
  }, [jobId])

  const value = useMemo(
    () => ({
      fileId,
      jobId,
      jobStatus,
      isPolling,
      pollingError,
      isStarting,
      jobError,
      analyzePdf,
      continueGeneration,
      isContinuingGeneration,
      continueGenerationError,
    }),
    [
      fileId,
      jobId,
      jobStatus,
      isPolling,
      pollingError,
      isStarting,
      jobError,
      analyzePdf,
      continueGeneration,
      isContinuingGeneration,
      continueGenerationError,
    ],
  )

  return (
    <DashboardFlowContext.Provider value={value}>
      {children}
    </DashboardFlowContext.Provider>
  )
}
