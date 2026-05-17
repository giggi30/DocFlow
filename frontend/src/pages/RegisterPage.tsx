import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

const defaultErrorMessage = 'Registrazione fallita. Verifica i dati.'

function resolveErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return defaultErrorMessage
  }

  const message = error.message.trim()
  if (!message) {
    return defaultErrorMessage
  }
  if (message.toLowerCase().includes('already')) {
    return 'Email gia registrata.'
  }
  return message
}

export default function RegisterPage() {
  const { isAuthenticated, isReady, register } = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
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
      await register(companyName.trim(), email.trim(), password)
      navigate('/login', {
        replace: true,
        state: { registered: true, email: email.trim() },
      })
    } catch (err) {
      setError(resolveErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-header">
          <span className="login-eyebrow">DocFlow</span>
          <h1>Crea il tuo account</h1>
          <p>Inserisci i dati aziendali per attivare la dashboard.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="register-company">Nome azienda</label>
            <input
              id="register-company"
              type="text"
              name="companyName"
              autoComplete="organization"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Azienda Srl"
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
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
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="login-actions">
            <button
              className="button-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrazione in corso...' : 'Registrati'}
            </button>
          </div>
        </form>
        <p className="login-footer">
          Hai gia un account? <Link to="/login">Accedi</Link>
        </p>
      </div>
    </div>
  )
}
