/**
 * OAuth helpers shared by sign-in and account linking flows.
 *
 * This module only deals with providers/credentials. It does not perform
 * sign-in/linking itself (callers decide signInWithCredential / linkWithCredential).
 */

import { Capacitor } from '@capacitor/core'
import { GoogleAuthProvider, OAuthProvider } from 'firebase/auth'

export function isNativePlatform() {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

function pickToken(obj, paths) {
  for (const p of paths) {
    if (obj && typeof obj === 'object' && p in obj) {
      const v = obj[p]
      if (v != null && v !== '') return v
    }
  }
  return null
}

export function createGooglePopupProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

export function createApplePopupProvider() {
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  return provider
}

export async function getNativeGoogleCredential() {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
  // We authenticate via the Firebase JS SDK (WebView). Avoid signing in twice by skipping native auth.
  const nativeResult = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })

  const idToken = pickToken(nativeResult?.credential, ['idToken']) ?? pickToken(nativeResult, ['idToken'])
  const accessToken =
    pickToken(nativeResult?.credential, ['accessToken']) ?? pickToken(nativeResult, ['accessToken'])

  if (!idToken && !accessToken) {
    throw new Error('Missing Google credential token from native sign-in result')
  }

  return GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null)
}

export async function getNativeAppleCredential() {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')

  if (typeof FirebaseAuthentication?.signInWithApple !== 'function') {
    throw Object.assign(new Error('Apple sign-in not supported'), { code: 'not-supported' })
  }

  // We authenticate via the Firebase JS SDK (WebView). Avoid signing in twice by skipping native auth.
  const nativeResult = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true })

  const idToken = pickToken(nativeResult?.credential, ['idToken']) ?? pickToken(nativeResult, ['idToken'])
  const rawNonce =
    pickToken(nativeResult?.credential, ['nonce', 'rawNonce']) ??
    pickToken(nativeResult, ['nonce', 'rawNonce'])

  if (!idToken) {
    throw new Error('Missing Apple idToken from native sign-in result')
  }

  // firebase@12: OAuthProvider.credential is undefined; use instance method.
  const provider = new OAuthProvider('apple.com')
  if (typeof provider?.credential !== 'function') {
    throw Object.assign(new Error('Apple credential API not available in firebase/auth'), {
      code: 'not-supported'
    })
  }

  // Safe debug: do not log token contents.
  console.info('[auth] native Apple sign-in result received', {
    hasIdToken: Boolean(idToken),
    hasRawNonce: Boolean(rawNonce)
  })

  if (!rawNonce) {
    throw new Error('Missing Apple nonce from native sign-in result')
  }

  return provider.credential({
    idToken,
    rawNonce
  })
}
