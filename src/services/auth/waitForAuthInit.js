import { getAuthStateReadyPromise } from '@/firebaseConfig'

/**
 * Resolves once Firebase Auth has restored persisted state from IndexedDB.
 * Uses authStateReady() so startup does not wait on network/token refresh.
 */
export function waitForAuthInit() {
  return getAuthStateReadyPromise()
}
