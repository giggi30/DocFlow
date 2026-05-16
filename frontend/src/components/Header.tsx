import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function Header() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header">
      <div className="app-header__title">
        <span className="app-header__eyebrow">DocFlow</span>
        <h1>Gestione documenti doganali</h1>
      </div>
      {session && (
        <div className="app-header__meta">
          <span className="app-header__company">{session.companyName}</span>
          <button
            type="button"
            className="button-secondary"
            onClick={handleLogout}
          >
            Esci
          </button>
        </div>
      )}
    </header>
  )
}
