import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { startJob } from '../api/jobs'
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
  const [jobError, setJobError] = useState<string | null>(null)
  const { data: jobStatus, isLoading: isPolling, error: pollingError } =
    useJobPolling(jobId)

  const analyzePdf = useCallback(async (file: File) => {
    setIsStarting(true)
    setJobError(null)
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
    ],
  )

  return (
    <DashboardFlowContext.Provider value={value}>
      {children}
    </DashboardFlowContext.Provider>
  )
}
