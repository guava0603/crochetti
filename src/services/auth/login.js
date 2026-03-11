/**
 * Auth helpers for signing users in.
 *
 * Keep this module UI-agnostic (no i18n / no modal/toast). Callers handle
 * messaging and confirmations.
 */

import {
  signInAnonymously,
  signInWithCredential
} from 'firebase/auth'

import {
  createApplePopupProvider,
  createGooglePopupProvider,
  getNativeAppleCredential,
  getNativeGoogleCredential,
  isNativePlatform
} from '@/services/auth/oauth'

/**
 * @param {import('firebase/auth').Auth} auth
 */
export async function signInAnonymous(auth) {
  return signInAnonymously(auth)
}

/**
 * Google sign-in.
 * - Native: uses @capacitor-firebase/authentication then exchanges token for Firebase credential.
 * - Web: uses signInWithPopup.
 *
 * @param {import('firebase/auth').Auth} auth
 */
export async function signInWithGoogle(auth) {
  if (isNativePlatform()) {
    const credential = await getNativeGoogleCredential()
    return signInWithCredential(auth, credential)
  }

  const { signInWithPopup } = await import('firebase/auth')
  const provider = createGooglePopupProvider()
  return signInWithPopup(auth, provider)
}

/**
 * Apple sign-in.
 * - Native: uses @capacitor-firebase/authentication (if available).
 * - Web: uses signInWithPopup.
 *
 * @param {import('firebase/auth').Auth} auth
 */
export async function signInWithApple(auth) {
  if (isNativePlatform()) {
    const credential = await getNativeAppleCredential()

    return signInWithCredential(auth, credential)
  }

  const { signInWithPopup } = await import('firebase/auth')
  const provider = createApplePopupProvider()
  return signInWithPopup(auth, provider)
}
