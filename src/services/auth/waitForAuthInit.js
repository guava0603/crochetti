import { onAuthStateChanged } from 'firebase/auth'

import { auth } from '@/firebaseConfig'

let authInitPromise = null

/**
 * Resolves once Firebase Auth has emitted its first auth state.
 * This avoids redirecting to /login before auth is actually initialized.
 */
export function waitForAuthInit() {
  if (authInitPromise) return authInitPromise

  authInitPromise = new Promise((resolve) => {
    const unsub = onAuthStateChanged(
      auth,
      () => {
        unsub()
        resolve()
      },
      () => {
        unsub()
        resolve()
      }
    )
  })

  return authInitPromise
}
