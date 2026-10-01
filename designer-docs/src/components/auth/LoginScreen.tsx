import { useState, type FormEvent } from 'react'
import { markAuthenticated } from '../../auth/session'
import { verifyLogin } from '../../auth/verify'

type LoginScreenProps = {
  onSuccess: () => void
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    void (async () => {
      try {
        const ok = await verifyLogin(username, password)
        if (!ok) {
          setError('Неверный логин или пароль.')
          return
        }
        markAuthenticated()
        onSuccess()
      } catch {
        setError('Не удалось проверить учётные данные.')
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <header className="auth-card__head">
          <p className="eyebrow">Designer Docs</p>
          <h1>Вход</h1>
          <p className="muted">Внутренний доступ к Symbol / Reel Lab</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Login</span>
            <input
              autoComplete="username"
              autoFocus
              disabled={busy}
              placeholder="Логин"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              disabled={busy}
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn--primary auth-form__submit" disabled={busy} type="submit">
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
