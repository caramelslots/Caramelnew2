import { useState, type ReactNode } from 'react'
import { isAuthenticated } from './auth/session'
import { LoginScreen } from './components/auth/LoginScreen'

type AuthGateProps = {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState(() => isAuthenticated())

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />
  }

  return children
}
