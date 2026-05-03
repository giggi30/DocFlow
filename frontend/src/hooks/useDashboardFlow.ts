import { useContext } from 'react'
import { DashboardFlowContext } from '../context/dashboardFlowContext'

export default function useDashboardFlow() {
  const context = useContext(DashboardFlowContext)

  if (!context) {
    throw new Error('useDashboardFlow must be used within DashboardFlowProvider')
  }

  return context
}
