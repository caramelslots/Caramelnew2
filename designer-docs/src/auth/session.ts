import { AUTH_SESSION_KEY, AUTH_SESSION_TTL_MS } from './credentials'

export function isAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return false
    const until = Number(raw)
    if (!Number.isFinite(until)) return false
    if (Date.now() >= until) {
      sessionStorage.removeItem(AUTH_SESSION_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function markAuthenticated(): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, String(Date.now() + AUTH_SESSION_TTL_MS))
}

export function clearAuthentication(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}
