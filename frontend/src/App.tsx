import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { AuthProvider } from './context/AuthProvider'
import { DashboardFlowProvider } from './context/DashboardFlowProvider'
import ArchivePage from './pages/ArchivePage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RequireAuth from './routes/RequireAuth'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route
              path="/"
              element={
                <DashboardFlowProvider>
                  <AppLayout />
                </DashboardFlowProvider>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
