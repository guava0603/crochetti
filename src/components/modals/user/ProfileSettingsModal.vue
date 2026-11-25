<template>
  <ModalShell
    :show="show"
    :title="computedTitle"
    max-width="480px"
    z-level="high"
    show-save-footer
    :cancel-label="computedCancelText"
    :save-label="computedSaveText"
    :saving-label="computedSavingText"
    :saving="saving"
    :save-disabled="linking || !isDirty"
    @close="handleCancel"
    @save="handleSave"
  >
    <div class="modal-field">
      <label class="modal-label" for="profile-name">{{ computedNameLabel }}</label>
      <TextInput
        id="profile-name"
        v-model="draftName"
        autocomplete="name"
      />
            </div>

            <div class="modal-field">
              <label class="modal-label">{{ computedAvatarLabel }}</label>
              <div class="avatar-row">
                <AvatarCircle
                  class="avatar-row__avatar"
                  :image-url="avatarPreviewUrl"
                  :alt="t('user.profileSettingsModal.avatarAlt', { n: 1 })"
                  :name="draftName"
                  size="4.25rem"
                  border="0.25rem solid white"
                />
                <button
                  class="avatar-row__edit"
                  type="button"
                  :disabled="saving"
                  :aria-label="t('user.avatarPicker.title')"
                  @click="openAvatarPicker"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="modal-field">
              <label class="modal-label">{{ t('user.profileSettingsModal.privacyLabel') }}</label>
              <SelectionButtonGroup
                v-model="draftPrivacy"
                :options="privacyOptions"
                :aria-label="t('user.profileSettingsModal.privacyLabel')"
                :disabled="saving"
              />
            </div>

            <div class="connected-accounts" aria-label="Connected accounts">
              <div class="connected-accounts__title">{{ t('auth.connectedAccounts.title') }}</div>

              <div v-if="isAnonymous && !hasLinkedProvider" class="connected-accounts__hint">
                {{ t('auth.connectedAccounts.anonymousHint') }}
              </div>

              <div v-if="displayProviderInfo.length" class="connected-accounts__list">
                <div v-for="p in displayProviderInfo" :key="p.providerId" class="connected-accounts__item">
                  <div class="connected-accounts__provider">{{ providerLabel(p.providerId) }}</div>
                  <div v-if="p.email" class="connected-accounts__meta">{{ p.email }}</div>
                </div>
              </div>
              <div v-else class="connected-accounts__none">
                {{ t('auth.connectedAccounts.none') }}
              </div>

              <div class="connected-accounts__actions">
                <button
                  v-if="!hasLinkedProvider && !hasGoogle"
                  class="btn-secondary"
                  type="button"
                  :disabled="saving || linking"
                  @click="handleConnectGoogle"
                >
                  {{ t('auth.connectedAccounts.connectGoogle') }}
                </button>

                <button
                  v-if="!hasLinkedProvider && !hasApple"
                  class="btn-secondary"
                  type="button"
                  :disabled="saving || linking"
                  @click="handleConnectApple"
                >
                  {{ t('auth.connectedAccounts.connectApple') }}
                </button>
              </div>
            </div>

  </ModalShell>

  <AvatarPickerModal
    :show="showAvatarPicker"
    :value="avatarPickerInitial"
    :avatar-files="avatarFiles"
    @close="cancelAvatarPicker"
    @save="saveAvatarPicker"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { auth } from '@/firebaseConfig'
import {
  linkWithCredential,
  linkWithPopup
} from 'firebase/auth'
import SelectionButtonGroup from '@/components/shared/selection/ButtonGroup.vue'
import AvatarCircle from '@/components/shared/image/AvatarCircle.vue'
import AvatarPickerModal from '@/components/modals/user/AvatarPickerModal.vue'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import TextInput from '@/components/shared/inputs/TextInput.vue'
import { openConfirmation } from '@/services/ui/confirmation'
import { openError } from '@/services/ui/error'
import { openToast } from '@/services/ui/toast'
import {
  AVATAR_FILES,
  AVATAR_IDS,
  avatarIdFromValue,
  avatarSrcFromId,
  isPresetAvatarValue
} from '@/constants/avatarPresets'
import {
  createApplePopupProvider,
  createGooglePopupProvider,
  getNativeAppleCredential,
  getNativeGoogleCredential,
  isNativePlatform
} from '@/services/auth/oauth'

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
const draftAvatar = ref('')
const draftPrivacy = ref('public')

const avatarFiles = AVATAR_FILES

const allowedAvatarIdSet = computed(() => {
  return new Set(['', ...AVATAR_IDS])
})

function normalizeAvatarValue(raw) {
  const id = avatarIdFromValue(raw)
  return allowedAvatarIdSet.value.has(id) ? id : ''
}

const avatarPreviewUrl = computed(() => {
  const presetSrc = avatarSrcFromId(draftAvatar.value)
  if (presetSrc) return presetSrc

  const raw = String(props.profile?.avatar || props.authUser?.photoURL || '').trim()
  if (!raw) return null
  if (isPresetAvatarValue(raw)) return avatarSrcFromId(avatarIdFromValue(raw)) || null
  return raw
})

const showAvatarPicker = ref(false)
const avatarPickerInitial = ref('')

function openAvatarPicker() {
  avatarPickerInitial.value = normalizeAvatarValue(draftAvatar.value)
  showAvatarPicker.value = true
}

function cancelAvatarPicker() {
  showAvatarPicker.value = false
}

function saveAvatarPicker(next) {
  draftAvatar.value = normalizeAvatarValue(next)
  showAvatarPicker.value = false
}

const linking = ref(false)
const providerInfo = ref([])
const providerIds = ref([])
const isAnonymous = ref(false)

const hasGoogle = computed(() => providerIds.value.includes('google.com'))
const hasApple = computed(() => providerIds.value.includes('apple.com'))
const hasLinkedProvider = computed(() => providerInfo.value.length > 0)

function isAppleRelayEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  return e.endsWith('@privaterelay.appleid.com')
}

function pickDisplayProvider(list) {
  const providers = Array.isArray(list) ? list : []
  if (!providers.length) return null

  // Prefer any provider with a non-relay email (e.g. Google).
  const nonRelay = providers.find((p) => p?.email && !isAppleRelayEmail(p.email))
  if (nonRelay) return nonRelay

  // Then prefer Google explicitly.
  const google = providers.find((p) => p?.providerId === 'google.com')
  if (google) return google

  // Fallback: first provider.
  return providers[0]
}

function resolveDisplayAccountName(provider, allProviders) {
  const p = provider || {}
  const providerId = String(p.providerId || '')
  const email = String(p.email || '').trim()
  if (email && !isAppleRelayEmail(email)) return email

  // If this provider is Apple relay but another linked provider has a real email, use that.
  const alt = Array.isArray(allProviders)
    ? allProviders.find((x) => x?.email && !isAppleRelayEmail(x.email))
    : null
  const altEmail = String(alt?.email || '').trim()
  if (altEmail) return altEmail

  // Fallbacks.
  const authEmail = String((auth.currentUser || props.authUser)?.email || '').trim()
  if (authEmail && !isAppleRelayEmail(authEmail)) return authEmail
  // Never show Apple's relay/generated identifiers; show only provider label.
  if (providerId === 'apple.com') return ''

  if (email && !isAppleRelayEmail(email)) return email

  const displayName = String(p.displayName || '').trim()
  return displayName
}

const displayProviderInfo = computed(() => {
  const list = providerInfo.value
  const chosen = pickDisplayProvider(list)
  if (!chosen) return []
  return [
    {
      ...chosen,
      email: resolveDisplayAccountName(chosen, list)
    }
  ]
})

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

const initialSnapshotName = ref('')
const initialSnapshotAvatar = ref('')
const initialSnapshotPrivacy = ref('public')

const privacyOptions = computed(() => [
  { id: 'public', label: t('user.profileSettingsModal.privacyPublic') },
  { id: 'private', label: t('user.profileSettingsModal.privacyPrivate') }
])

watch(
  () => [props.show, props.profile, props.authUser],
  async () => {
    if (!props.show) return
    initialSnapshotName.value = initialName.value
    initialSnapshotAvatar.value = normalizeAvatarValue(props.profile?.avatar)
    initialSnapshotPrivacy.value = props.profile?.is_privacy ? 'private' : 'public'

    draftName.value = initialSnapshotName.value
    draftAvatar.value = initialSnapshotAvatar.value
    draftPrivacy.value = initialSnapshotPrivacy.value
    await refreshProviders()
  },
  { immediate: true }
)

const isDirty = computed(() => {
  const nameNow = String(draftName.value || '').trim()
  const nameInit = String(initialSnapshotName.value || '').trim()
  const avatarNow = normalizeAvatarValue(draftAvatar.value)
  const avatarInit = normalizeAvatarValue(initialSnapshotAvatar.value)
  const privacyNow = draftPrivacy.value === 'private' ? 'private' : 'public'
  const privacyInit = initialSnapshotPrivacy.value === 'private' ? 'private' : 'public'
  return nameNow !== nameInit || avatarNow !== avatarInit || privacyNow !== privacyInit
})

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
  if (!user) return
  if (hasLinkedProvider.value) return

  linking.value = true
  try {
    if (isNativePlatform()) {
      const credential = await getNativeGoogleCredential()
      await linkWithCredential(user, credential)
    } else {
      await linkWithPopup(user, createGooglePopupProvider())
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
  if (!user) return
  if (hasLinkedProvider.value) return

  linking.value = true
  try {
    if (isNativePlatform()) {
      const credential = await getNativeAppleCredential()
      await linkWithCredential(user, credential)
    } else {
      await linkWithPopup(user, createApplePopupProvider())
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
  if (!isDirty.value || props.saving || linking.value) {
    emit('close')
    return
  }

  void (async () => {
    const ok = await openConfirmation({ type: 'discardChanges' })
    if (!ok) return
    emit('close')
  })()
}

function handleSave() {
  if (!isDirty.value) return
  if (props.saving || linking.value) return
  emit('save', {
    name: String(draftName.value || '').trim(),
    avatar: draftAvatar.value || null,
    is_privacy: draftPrivacy.value === 'private'
  })
}
</script>

<style scoped>
.profile-avatar-uploader {
  width: 100%;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-row__avatar {
  flex: none;
}

.avatar-row__edit {
  border: 1px solid rgba(17, 24, 39, 0.1);
  background: rgba(255, 255, 255, 0.85);
  color: rgba(17, 24, 39, 0.85);
  border-radius: 12px;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}

.avatar-row__edit:hover {
  transform: translateY(-1px);
  background: #ffffff;
}

.avatar-row__edit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
