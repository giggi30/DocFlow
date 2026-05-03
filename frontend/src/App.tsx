import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { DashboardFlowProvider } from './context/DashboardFlowProvider'
import ArchivePage from './pages/ArchivePage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <DashboardFlowProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="archive" element={<ArchivePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </DashboardFlowProvider>
    </BrowserRouter>
  )
}

export default App
