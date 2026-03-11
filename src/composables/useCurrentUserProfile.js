import { onMounted, onUnmounted, ref, watch } from 'vue'
import { auth } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { subscribeUserProfile } from '@/services/firestore/user'
import { useLatestRecordStore } from '@/stores/latestRecordStore'

function getAuthFallbackProfile(authUser, anonymousLabel = 'Anonymous') {
  const provider = Array.isArray(authUser?.providerData)
    ? authUser.providerData.find(Boolean)
    : null

  const name =
    authUser?.displayName ||
    provider?.displayName ||
    authUser?.email ||
    provider?.email ||
    anonymousLabel

  const avatar = authUser?.photoURL || provider?.photoURL || null

  return {
    name: String(name || anonymousLabel),
    avatar: avatar ? String(avatar) : null
  }
}

function normalizeProfileWithFallback(rawProfile, fallbackProfile, anonymousLabel = 'Anonymous') {
  const base = (rawProfile && typeof rawProfile === 'object') ? rawProfile : {}
  const nameRaw = base?.name != null ? String(base.name).trim() : ''
  const avatarRaw = base?.avatar != null ? String(base.avatar).trim() : ''

  return {
    ...base,
    name: nameRaw || fallbackProfile?.name || anonymousLabel,
    avatar: avatarRaw || fallbackProfile?.avatar || null
  }
}

/**
 * Provides the currently signed-in Firebase user and their profile document.
 *
 * - `currentUser` mirrors Firebase auth state
 * - `profile` mirrors `/users/{uid}/profile/info` (via onSnapshot)
 */
export function useCurrentUserProfile(options = {}) {
  const {
    anonymousLabel = 'Anonymous',
    fallbackProfile = null,
    normalize = true
  } = options || {}

  // Tri-state auth user:
  // - `undefined`: auth not resolved yet
  // - `null`: resolved, signed out
  // - object: resolved, signed in
  const currentUser = ref(undefined)
  const profile = ref(null)
  const loading = ref(true)

  const latestRecordStore = useLatestRecordStore()

  let unsubscribeAuth = null
  let unsubscribeProfile = null

  onMounted(() => {
    unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      currentUser.value = u || null
    })
  })

  onUnmounted(() => {
    if (unsubscribeAuth) unsubscribeAuth()
    if (unsubscribeProfile) unsubscribeProfile()
  })

  watch(
    () => {
      if (currentUser.value === undefined) return undefined
      return currentUser.value?.uid ? String(currentUser.value.uid) : ''
    },
    (uid) => {
      // Auth not resolved yet.
      if (uid === undefined) return

      if (unsubscribeProfile) {
        unsubscribeProfile()
        unsubscribeProfile = null
      }

      const userId = uid != null ? String(uid).trim() : ''
      if (!userId) {
        profile.value = null
        loading.value = false

        latestRecordStore.reset()
        return
      }

      loading.value = true

      const fallback = fallbackProfile
        ? (typeof fallbackProfile === 'function' ? fallbackProfile(currentUser.value) : fallbackProfile)
        : getAuthFallbackProfile(currentUser.value, anonymousLabel)

      // Provide a safe fallback immediately, even before the first snapshot arrives.
      profile.value = normalize
        ? normalizeProfileWithFallback(null, fallback, anonymousLabel)
        : fallback

      // Fetch latest record in parallel with profile snapshot.
      // Do not block the profile loading state on this.
      latestRecordStore.fetchLatestRecord(userId)

      unsubscribeProfile = subscribeUserProfile({
        userId,
        fallbackProfile: fallback,
        onData: (profileData) => {
          profile.value = normalize
            ? normalizeProfileWithFallback(profileData, fallback, anonymousLabel)
            : ((profileData && typeof profileData === 'object') ? profileData : fallback)
          loading.value = false
        },
        onError: (error) => {
          console.error('Error listening to current user profile:', error)
          profile.value = null
          loading.value = false
        }
      })
    },
    { immediate: true }
  )

  return {
    currentUser,
    profile,
    loading,
    latestRecordData: latestRecordStore.latestRecordData,
    latestRecordLoading: latestRecordStore.loading,
    refreshLatestRecord: () => latestRecordStore.fetchLatestRecord(currentUser.value?.uid)
  }
}
