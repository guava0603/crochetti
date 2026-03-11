<template>
  <main class="login-view">
    <section class="login-card" aria-label="login">
      <header class="login-card__header">
        <h1 class="login-card__title">{{ t('auth.loginModal.title') }}</h1>
        <p class="login-card__desc">{{ t('auth.loginModal.description') }}</p>
      </header>

      <div class="login-card__actions">
        <button
          class="google-signin-button"
          type="button"
          @click="handleGoogleLogin"
          :disabled="loading"
        >
          <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span v-if="loading">{{ t('auth.loginModal.signingIn') }}</span>
          <span v-else>{{ t('auth.loginModal.google') }}</span>
        </button>

        <button
          class="apple-signin-button"
          type="button"
          @click="handleAppleLogin"
          :disabled="loading"
        >
          <svg class="apple-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
          </svg>
          <span v-if="loading">{{ t('auth.loginModal.signingIn') }}</span>
          <span v-else>{{ t('auth.loginModal.apple') }}</span>
        </button>

        <button
          class="quick-start-button"
          type="button"
          @click="handleQuickStart"
          :disabled="loading"
        >
          <span v-if="loading">{{ t('auth.loginModal.signingIn') }}</span>
          <span v-else>{{ t('auth.quickStart') }}</span>
        </button>

        <button
          class="cancel-button"
          type="button"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ t('auth.loginModal.cancel') }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { auth } from '@/firebaseConfig'

import { openConfirmation } from '@/services/ui/confirmation'
import { openError } from '@/services/ui/error'

import { signInAnonymous, signInWithApple, signInWithGoogle } from '@/services/auth/login'
import { useAppBanner } from '@/composables/appBanner'

defineOptions({ name: 'LoginViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null }
})

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const appBanner = useAppBanner()

const currentUser = computed(() => props.currentUser)

const loading = ref(false)
let didAutoRedirect = false

function getRedirectPath() {
  const raw = route.query?.redirect
  const v = raw != null ? String(raw).trim() : ''
  if (!v) return ''
  // Only allow internal paths.
  return v.startsWith('/') ? v : ''
}

async function goAfterLogin() {
  const redirect = getRedirectPath()
  if (redirect) {
    await router.replace(redirect)
    return
  }
  await router.replace({ name: 'home' })
}

function handleBack() {
  // Prefer navigating back in history (e.g. if user came from a deep link).
  if (window.history.length > 1) {
    router.back()
    return
  }

  // Avoid looping back to /home which will typically redirect to /login again.
  const redirect = getRedirectPath()
  if (redirect && redirect !== '/home') {
    router.replace(redirect)
    return
  }

  router.replace({ name: 'about' })
}

const showError = (message) => {
  const msg = String(message || '').trim()
  if (msg) {
    openError({ title: t('common.error'), message: msg })
  }
}

onMounted(() => {
  appBanner?.setBanner({ visible: true, title: t('auth.login'), showBack: true, onBack: handleBack })
})

watch(
  () => currentUser.value,
  (user) => {
    // Wait for auth resolution.
    if (user === undefined) return
    if (!user?.uid) return
    if (didAutoRedirect) return
    didAutoRedirect = true

    // Already logged in (or just finished logging in).
    void goAfterLogin()
  },
  { immediate: true }
)

onUnmounted(() => {
  appBanner?.setBanner({ onBack: null })
})

const handleQuickStart = async () => {
  if (loading.value) return

  const ok = await openConfirmation({ type: 'quickStartAnonymous' })
  if (!ok) return

  loading.value = true
  try {
    await signInAnonymous(auth)
    await goAfterLogin()
  } catch (err) {
    console.error('Anonymous login error:', err)
    showError(err?.message || 'Failed to sign in. Please try again.')
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  if (loading.value) return

  loading.value = true
  try {
    await signInWithGoogle(auth)
    await goAfterLogin()
  } catch (err) {
    console.error('Login error:', err)

    if (err?.code === 'auth/configuration-not-found') {
      showError('Google Sign-In is not configured. Please enable Google authentication in Firebase Console: Authentication > Sign-in method > Google')
    } else if (err?.code === 'auth/popup-closed-by-user') {
      showError('Sign-in cancelled')
    } else if (err?.code === 'auth/popup-blocked') {
      showError('Pop-up blocked by browser. Please allow pop-ups for this site.')
    } else if (err?.code === 'auth/cancelled-popup-request') {
      // Ignore; user clicked twice.
    } else {
      showError(err?.message || 'Failed to sign in. Please try again.')
    }
  } finally {
    loading.value = false
  }
}

const handleAppleLogin = async () => {
  if (loading.value) return

  loading.value = true
  try {
    await signInWithApple(auth)
    await goAfterLogin()
  } catch (err) {
    console.error('Apple login error:', err)

    if (err?.code === 'not-supported') {
      showError('Apple Sign-In is not supported on this platform.')
    } else if (err?.code === 'auth/operation-not-allowed') {
      showError('Apple Sign-In is not enabled. Please enable it in Firebase Console: Authentication > Sign-in method > Apple')
    } else if (err?.code === 'auth/configuration-not-found') {
      showError('Apple Sign-In is not configured. Please enable Apple authentication in Firebase Console: Authentication > Sign-in method > Apple')
    } else if (err?.code === 'auth/popup-closed-by-user') {
      showError('Sign-in cancelled')
    } else if (err?.code === 'auth/popup-blocked') {
      showError('Pop-up blocked by browser. Please allow pop-ups for this site.')
    } else if (err?.code === 'auth/cancelled-popup-request') {
      showError('Sign-in cancelled')
    } else {
      showError(err?.message || 'Failed to sign in. Please try again.')
    }
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  handleBack()
}
</script>

<style scoped>
.login-view {
  min-height: calc(100vh - var(--banner-height, 0px));
  display: grid;
  place-items: center;
  padding: 1.5rem 1.25rem;
  background: var(--color-surface-sheet);
}

.login-card {
  width: min(520px, 100%);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
  padding: 1.25rem;
}

.login-card__header {
  margin-bottom: 1rem;
}

.login-card__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--color-font-dark);
}

.login-card__desc {
  margin: 0.5rem 0 0;
  color: var(--color-font-invisible);
  font-weight: 700;
}

.login-card__actions {
  display: grid;
  gap: 0.75rem;
}

.google-signin-button,
.apple-signin-button,
.quick-start-button,
.cancel-button {
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.google-signin-button {
  background: #fff;
  color: #111827;
}

.apple-signin-button {
  background: #111827;
  color: #fff;
  border-color: rgba(17, 24, 39, 0.2);
}

.quick-start-button {
  background: rgba(255, 255, 255, 0.65);
  color: var(--color-font-dark);
}

.cancel-button {
  background: transparent;
  color: var(--color-font-invisible);
}

.google-icon,
.apple-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
