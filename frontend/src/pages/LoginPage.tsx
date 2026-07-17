import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import logo from '../assets/icon.png'

export default function LoginPage() {
  const { isAuthenticated, isReady, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { registered, email: registeredEmail } =
    (location.state as { registered?: boolean; email?: string } | null) ?? {}
  const [email, setEmail] = useState(registeredEmail ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isReady && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch {
      setError('Credenziali non valide. Verifica email e password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__brand">
        <img className="auth-page__logo" src={logo} alt="Gestionale Doganale" />
        <span className="auth-page__name">DocFlow</span>
      </div>

      <div className="auth-copy">
        <span className="auth-kicker">Gestione documentale e doganale</span>
        <h1>Digitalizza, analizza e genera documenti in un unico flusso</h1>
        <p>Una piattaforma pensata per lavorare meglio, con meno passaggi e più controllo.</p>
      </div>

      <div className="login-shell">
        <div className="login-card">
          <div className="login-header">
            <h2>Accesso area riservata</h2>
            <p>Inserisci le credenziali per accedere alla dashboard.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@azienda.it"
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            {!error && registered && (
              <p className="success-text">Registrazione completata. Ora accedi.</p>
            )}
            <div className="login-actions">
              <button className="button-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
              </button>
            </div>
          </form>
          <p className="login-footer">
            Non hai un account? <Link to="/register">Registrati</Link>
          </p>
          <p className="login-footer">Per assistenza contatta il team interno DocFlow.</p>
        </div>
      </div>
    </div>
  )
}
