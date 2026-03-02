import { auth } from '@/firebaseConfig'

// Centralized App ID lookup.
// - Prefer runtime Firebase app options (works across environments)
// - Fallback to Vite env (if provided)
// - Final fallback: known default project id
export function getAppId() {
  const fromAuth = auth?.app?.options?.projectId
  if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth.trim()

  const fromEnv = import.meta?.env?.VITE_FIREBASE_PROJECT_ID
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim()

  return 'corchetti-ec876'
}
