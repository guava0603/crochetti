<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="handleCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h2>Sign In</h2>
            <button class="close-button" @click="handleCancel">×</button>
          </div>

          <div class="modal-body">
            <p class="modal-description">
              Sign in to access all features
            </p>

            <div v-if="error" class="error-message">
              {{ error }}
            </div>

            <button
              class="google-signin-button"
              @click="handleGoogleLogin"
              :disabled="loading"
            >
              <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span v-if="loading">Signing in...</span>
              <span v-else>Sign in with Google</span>
            </button>

            <button
              class="apple-signin-button"
              @click="handleAppleLogin"
              :disabled="loading"
            >
              <svg class="apple-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
              </svg>
              <span v-if="loading">Signing in...</span>
              <span v-else>Sign in with Apple</span>
            </button>

            <button
              class="cancel-button"
              @click="handleCancel"
              :disabled="loading"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { auth } from '../firebaseConfig'
import { signInWithCredential, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth'

defineProps({
  show: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'login-success'])

const loading = ref(false)
const error = ref(null)

const handleGoogleLogin = async () => {
  console.log('Google login initiated')
  loading.value = true
  error.value = null

  try {
    const isApp = Capacitor.isNativePlatform()
    console.log('Starting Google login. Running in app:', isApp)

    let result

    if (isApp) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')

      // Force native Google sign-in. The plugin should NOT use a web OAuth flow inside the WebView.
      const nativeResult = await FirebaseAuthentication.signInWithGoogle()

      const idToken = nativeResult?.credential?.idToken || nativeResult?.idToken
      const accessToken = nativeResult?.credential?.accessToken || nativeResult?.accessToken

      if (!idToken && !accessToken) {
        throw new Error('Missing Google credential token from native sign-in result')
      }

      const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null)
      result = await signInWithCredential(auth, credential)
    } else {
      const provider = new GoogleAuthProvider()

      // Suppress COOP warnings by setting provider custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      })

      result = await signInWithPopup(auth, provider)
    }

    // User successfully signed in
    console.log('User signed in:', result.user)
    emit('login-success', result.user)
    emit('close')
  } catch (err) {
    console.error('Login error:', err)

    // Provide helpful error messages
    if (err.code === 'auth/configuration-not-found') {
      error.value = 'Google Sign-In is not configured. Please enable Google authentication in Firebase Console: Authentication > Sign-in method > Google'
    } else if (err.code === 'auth/popup-closed-by-user') {
      error.value = 'Sign-in cancelled'
    } else if (err.code === 'auth/popup-blocked') {
      error.value = 'Pop-up blocked by browser. Please allow pop-ups for this site.'
    } else if (err.code === 'auth/cancelled-popup-request') {
      // Silently ignore cancelled popup requests (happens when user clicks login multiple times)
      error.value = null
    } else {
      error.value = err.message || 'Failed to sign in. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const handleAppleLogin = async () => {
  loading.value = true
  error.value = null

  try {
    const provider = new OAuthProvider('apple.com')

    // Optional: Request additional scopes
    provider.addScope('email')
    provider.addScope('name')

    const result = await signInWithPopup(auth, provider)

    // User successfully signed in
    console.log('User signed in with Apple:', result.user)
    emit('login-success', result.user)
    emit('close')
  } catch (err) {
    console.error('Apple login error:', err)

    // Provide helpful error messages
    if (err.code === 'auth/operation-not-allowed') {
      error.value = 'Apple Sign-In is not enabled. Please enable it in Firebase Console: Authentication > Sign-in method > Apple'
    } else if (err.code === 'auth/configuration-not-found') {
      error.value = 'Apple Sign-In is not configured. Please enable Apple authentication in Firebase Console: Authentication > Sign-in method > Apple'
    } else if (err.code === 'auth/popup-closed-by-user') {
      error.value = 'Sign-in cancelled'
    } else if (err.code === 'auth/popup-blocked') {
      error.value = 'Pop-up blocked by browser. Please allow pop-ups for this site.'
    } else if (err.code === 'auth/cancelled-popup-request') {
      error.value = null
    } else {
      error.value = err.message || 'Failed to sign in. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: white;
  border-radius: 12px;
  max-width: 440px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 2rem;
}

.modal-description {
  color: #6b7280;
  margin-bottom: 2rem;
  text-align: center;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.google-signin-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
}

.google-signin-button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.google-signin-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 20px;
  height: 20px;
}

.apple-signin-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  background: #000;
  border: 1px solid #000;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
}

.apple-signin-button:hover:not(:disabled) {
  background: #1a1a1a;
  border-color: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.apple-signin-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.apple-icon {
  width: 20px;
  height: 20px;
}

.cancel-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button:hover:not(:disabled) {
  background: #e5e7eb;
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
