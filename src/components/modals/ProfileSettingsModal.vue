<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="handleCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h2>{{ computedTitle }}</h2>
            <button class="close-button" type="button" @click="handleCancel">×</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label class="label" for="profile-name">{{ computedNameLabel }}</label>
              <input
                id="profile-name"
                v-model="draftName"
                class="input"
                type="text"
                autocomplete="name"
              />
            </div>

            <div class="field">
              <label class="label" for="profile-avatar">{{ computedAvatarLabel }}</label>
              <div id="profile-avatar" class="profile-avatar-uploader">
                <ImageUploader
                  v-model="draftAvatarFiles"
                  :max="1"
                  accept="image/*"
                  :multiple="false"
                  :disabled="saving"
                  :button-text="computedAvatarLabel"
                  :remove-text="t('addProject.info.removeImage')"
                  :max-error-text="t('addProject.info.errors.maxImages', { max: 1 })"
                  :alt-text-for-index="(i) => t('user.profileSettingsModal.avatarAlt', { n: i + 1 })"
                />
              </div>
            </div>

            <div class="connected-accounts" aria-label="Connected accounts">
              <div class="connected-accounts__title">{{ t('auth.connectedAccounts.title') }}</div>

              <div v-if="isAnonymous" class="connected-accounts__hint">
                {{ t('auth.connectedAccounts.anonymousHint') }}
              </div>

              <div v-if="providerInfo.length" class="connected-accounts__list">
                <div v-for="p in providerInfo" :key="p.providerId" class="connected-accounts__item">
                  <div class="connected-accounts__provider">{{ providerLabel(p.providerId) }}</div>
                  <div v-if="p.email" class="connected-accounts__meta">{{ p.email }}</div>
                </div>
              </div>
              <div v-else class="connected-accounts__none">
                {{ t('auth.connectedAccounts.none') }}
              </div>

              <div class="connected-accounts__actions">
                <button
                  v-if="!hasGoogle"
                  class="btn-secondary"
                  type="button"
                  :disabled="saving || linking"
                  @click="handleConnectGoogle"
                >
                  {{ t('auth.connectedAccounts.connectGoogle') }}
                </button>

                <button
                  v-if="!hasApple"
                  class="btn-secondary"
                  type="button"
                  :disabled="saving || linking"
                  @click="handleConnectApple"
                >
                  {{ t('auth.connectedAccounts.connectApple') }}
                </button>
              </div>
            </div>

            <div class="actions">
              <button class="btn-secondary" type="button" :disabled="saving" @click="handleCancel">
                {{ computedCancelText }}
              </button>
              <button class="btn-primary" type="button" :disabled="saving" @click="handleSave">
                {{ saving ? computedSavingText : computedSaveText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { auth } from '@/firebaseConfig'
import {
  GoogleAuthProvider,
  OAuthProvider,
  linkWithCredential
} from 'firebase/auth'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import { openError } from '@/services/ui/error'
import { openToast } from '@/services/ui/toast'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  show: { type: Boolean, required: true },
  profile: { type: Object, default: null },
  authUser: { type: Object, default: null },
  saving: { type: Boolean, default: false },

  title: { type: String, default: '' },
  nameLabel: { type: String, default: '' },
  avatarLabel: { type: String, default: '' },
  cancelText: { type: String, default: '' },
  saveText: { type: String, default: '' },
  savingText: { type: String, default: '' }
})

const emit = defineEmits(['close', 'save'])

const draftName = ref('')
const draftAvatarFiles = ref([])

const linking = ref(false)
const providerInfo = ref([])
const providerIds = ref([])
const isAnonymous = ref(false)

const hasGoogle = computed(() => providerIds.value.includes('google.com'))
const hasApple = computed(() => providerIds.value.includes('apple.com'))

const providerLabel = (providerId) => {
  const id = String(providerId || '')
  if (id === 'google.com') return t('auth.providers.google')
  if (id === 'apple.com') return t('auth.providers.apple')
  return id
}

const computedTitle = computed(() => props.title || t('user.profileSettingsModal.title'))
const computedNameLabel = computed(() => props.nameLabel || t('user.profileSettingsModal.nameLabel'))
const computedAvatarLabel = computed(() => props.avatarLabel || t('user.profileSettingsModal.avatarLabel'))
const computedCancelText = computed(() => props.cancelText || t('common.cancel'))
const computedSaveText = computed(() => props.saveText || t('common.save'))
const computedSavingText = computed(() => props.savingText || t('common.saving'))

const initialName = computed(() => String(props.profile?.name || '').trim())

watch(
  () => [props.show, props.profile, props.authUser],
  async () => {
    if (!props.show) return
    draftName.value = initialName.value
    draftAvatarFiles.value = []
    await refreshProviders()
  },
  { immediate: true }
)

async function refreshProviders() {
  const user = auth.currentUser || props.authUser
  if (!user) {
    providerInfo.value = []
    providerIds.value = []
    isAnonymous.value = false
    return
  }

  try {
    if (typeof user.reload === 'function') {
      await user.reload()
    }
  } catch {
    // ignore reload failures; still render best-effort provider data
  }

  const list = Array.isArray(user.providerData) ? user.providerData : []
  providerInfo.value = list
    .map((p) => ({
      providerId: String(p?.providerId || ''),
      email: String(p?.email || ''),
      displayName: String(p?.displayName || '')
    }))
    .filter((p) => p.providerId)

  providerIds.value = providerInfo.value.map((p) => p.providerId)
  isAnonymous.value = Boolean(user.isAnonymous)
}

async function handleConnectGoogle() {
  if (linking.value) return
  const user = auth.currentUser
  if (!user) {
    openError({ title: t('common.error'), message: t('auth.loginRequired'), confirmText: t('common.ok') })
    return
  }

  linking.value = true
  try {
    const isApp = Capacitor.isNativePlatform()

    if (isApp) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      const nativeResult = await FirebaseAuthentication.signInWithGoogle()

      const idToken = nativeResult?.credential?.idToken || nativeResult?.idToken
      const accessToken = nativeResult?.credential?.accessToken || nativeResult?.accessToken
      if (!idToken && !accessToken) {
        throw new Error('Missing Google credential token from native sign-in result')
      }

      const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null)
      await linkWithCredential(user, credential)
    } else {
      const { linkWithPopup } = await import('firebase/auth')
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await linkWithPopup(user, provider)
    }

    await refreshProviders()
    openToast({ message: t('auth.connectedAccounts.connectSuccess', { provider: t('auth.providers.google') }) })
  } catch (err) {
    console.error('Connect Google failed:', err)
    const code = err?.code
    if (code === 'auth/credential-already-in-use') {
      openError({
        title: t('common.error'),
        message: t('auth.connectedAccounts.alreadyInUse', { provider: t('auth.providers.google') }),
        confirmText: t('common.ok')
      })
    } else {
      openError({
        title: t('common.error'),
        message: t('auth.connectedAccounts.connectFailed', { provider: t('auth.providers.google') }),
        confirmText: t('common.ok')
      })
    }
  } finally {
    linking.value = false
  }
}

async function handleConnectApple() {
  if (linking.value) return
  const user = auth.currentUser
  if (!user) {
    openError({ title: t('common.error'), message: t('auth.loginRequired'), confirmText: t('common.ok') })
    return
  }

  linking.value = true
  try {
    const isApp = Capacitor.isNativePlatform()

    if (isApp) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      if (typeof FirebaseAuthentication?.signInWithApple !== 'function') {
        throw Object.assign(new Error('Apple sign-in not supported'), { code: 'not-supported' })
      }

      const nativeResult = await FirebaseAuthentication.signInWithApple()
      const idToken = nativeResult?.credential?.idToken || nativeResult?.idToken
      const rawNonce = nativeResult?.credential?.nonce || nativeResult?.nonce || nativeResult?.credential?.rawNonce || nativeResult?.rawNonce
      if (!idToken) {
        throw new Error('Missing Apple idToken from native sign-in result')
      }

      const credential = OAuthProvider.credential({
        providerId: 'apple.com',
        idToken,
        rawNonce: rawNonce || undefined
      })

      await linkWithCredential(user, credential)
    } else {
      const { linkWithPopup } = await import('firebase/auth')
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      await linkWithPopup(user, provider)
    }

    await refreshProviders()
    openToast({ message: t('auth.connectedAccounts.connectSuccess', { provider: t('auth.providers.apple') }) })
  } catch (err) {
    console.error('Connect Apple failed:', err)
    const code = err?.code
    if (code === 'not-supported') {
      openError({
        title: t('common.error'),
        message: t('auth.connectedAccounts.notSupported', { provider: t('auth.providers.apple') }),
        confirmText: t('common.ok')
      })
    } else if (code === 'auth/credential-already-in-use') {
      openError({
        title: t('common.error'),
        message: t('auth.connectedAccounts.alreadyInUse', { provider: t('auth.providers.apple') }),
        confirmText: t('common.ok')
      })
    } else {
      openError({
        title: t('common.error'),
        message: t('auth.connectedAccounts.connectFailed', { provider: t('auth.providers.apple') }),
        confirmText: t('common.ok')
      })
    }
  } finally {
    linking.value = false
  }
}

function handleCancel() {
  emit('close')
}

function handleSave() {
  emit('save', {
    name: String(draftName.value || '').trim(),
    avatar_files: Array.isArray(draftAvatarFiles.value) ? draftAvatarFiles.value : []
  })
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
  max-width: 480px;
  width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
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
  border-radius: 6px;
}

.close-button:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
}

.label {
  font-size: 0.9rem;
  font-weight: 800;
  color: #111827;
}

.input {
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-weight: 700;
  color: #111827;
}

.profile-avatar-uploader {
  width: 100%;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.connected-accounts {
  margin-top: 1.1rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(17, 24, 39, 0.1);
}

.connected-accounts__title {
  font-size: 0.95rem;
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.45rem;
}

.connected-accounts__hint {
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(17, 24, 39, 0.7);
  margin-bottom: 0.6rem;
}

.connected-accounts__list {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.7rem;
}

.connected-accounts__item {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.15rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.04);
}

.connected-accounts__provider {
  font-weight: 900;
  color: #111827;
}

.connected-accounts__meta {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(17, 24, 39, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
}

.connected-accounts__none {
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(17, 24, 39, 0.7);
  margin-bottom: 0.7rem;
}

.connected-accounts__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
</style>
