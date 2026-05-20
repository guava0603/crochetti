import { onMounted, onUnmounted, ref, watch } from 'vue'
import { auth } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { subscribeUserProfile, updateUserProfile } from '@/services/firestore/user'
import { getOrCreateCurrentUserFriendCode } from '@/services/firestore/friendCode'
import { useLatestRecordStore } from '@/stores/latestRecordStore'
import { clearLastAccessedRecordId, readLastAccessedRecordId } from '@/utils/lastAccessedRecord'

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

  let friendCodeAttemptedForUid = null
  let friendCodeAttemptInFlight = false

  let baselineProfileAttemptedForUid = null
  let baselineProfileAttemptInFlight = false

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
        clearLastAccessedRecordId()

        friendCodeAttemptedForUid = null
        friendCodeAttemptInFlight = false
        return
      }

      friendCodeAttemptedForUid = null
      friendCodeAttemptInFlight = false

      baselineProfileAttemptedForUid = null
      baselineProfileAttemptInFlight = false

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
      try {
        void latestRecordStore.hydrateLatestRecord(userId, {
          preferredRecordId: readLastAccessedRecordId()
        })
      } catch {
        void latestRecordStore.fetchLatestRecord(userId)
      }

      unsubscribeProfile = subscribeUserProfile({
        userId,
        fallbackProfile: fallback,
        onData: (profileData) => {
          const raw = (profileData && typeof profileData === 'object') ? profileData : null

          profile.value = normalize
            ? normalizeProfileWithFallback(raw, fallback, anonymousLabel)
            : (raw || fallback)
          loading.value = false

          // Best-effort: ensure basic public profile fields exist so other users
          // can see correct name/avatar on UserView.
          try {
            if (!baselineProfileAttemptInFlight && baselineProfileAttemptedForUid !== userId) {
              const rawName = raw?.name != null ? String(raw.name).trim() : ''
              const rawAvatar = raw?.avatar != null ? String(raw.avatar).trim() : ''

              const patch = {}
              const fbName = fallback?.name != null ? String(fallback.name).trim() : ''
              const fbAvatar = fallback?.avatar != null ? String(fallback.avatar).trim() : ''

              if (!rawName && fbName) patch.name = fbName
              if (!rawAvatar && fbAvatar) patch.avatar = fbAvatar

              if (Object.keys(patch).length) {
                baselineProfileAttemptInFlight = true
                baselineProfileAttemptedForUid = userId
                void updateUserProfile({ userId, profileData: patch })
                  .catch(() => {})
                  .finally(() => {
                    baselineProfileAttemptInFlight = false
                  })
              } else {
                baselineProfileAttemptedForUid = userId
              }
            }
          } catch {
            // ignore
          }

          // Ensure friend_code exists for all users (new + legacy).
          // Best-effort: attempt at most once per uid per session to avoid spamming transactions.
          try {
            if (!friendCodeAttemptInFlight && friendCodeAttemptedForUid !== userId) {
              const current = profile.value
              const existing = String(current?.friend_code || current?.friendCode || '').trim()
              if (!existing) {
                friendCodeAttemptInFlight = true
                friendCodeAttemptedForUid = userId
                void getOrCreateCurrentUserFriendCode(current || {})
                  .catch(() => {})
                  .finally(() => {
                    friendCodeAttemptInFlight = false
                  })
              } else {
                friendCodeAttemptedForUid = userId
              }
            }
          } catch {
            // ignore
          }
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
