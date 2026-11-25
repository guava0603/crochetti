import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { onAuthStateChanged } from 'firebase/auth'

import { auth, getAuthStateReadyPromise } from '@/firebaseConfig'
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

let started = false
let unsubscribeAuth = null
let unsubscribeProfile = null
let friendCodeAttemptedForUid = null
let friendCodeAttemptInFlight = false
let baselineProfileAttemptedForUid = null
let baselineProfileAttemptInFlight = false
let latestHydratedUid = null
let activeProfileUid = null

export const useUserProfileStore = defineStore('userProfile', () => {
  const anonymousLabel = ref('Anonymous')

  // Tri-state: undefined = auth pending, null = signed out, object = signed in
  const currentUser = ref(undefined)
  const profile = ref(null)

  const authReady = computed(() => currentUser.value !== undefined)

  /** True only while auth state has not been restored yet. */
  const loading = computed(() => !authReady.value)

  function setAnonymousLabel(label) {
    const next = String(label || '').trim()
    if (!next) return
    anonymousLabel.value = next
  }

  function resolveFallbackProfile(authUser) {
    return getAuthFallbackProfile(authUser, anonymousLabel.value)
  }

  function applyProfileFromSnapshot(rawProfile, authUser, userId) {
    const fallback = resolveFallbackProfile(authUser)
    const raw = (rawProfile && typeof rawProfile === 'object') ? rawProfile : null

    profile.value = normalizeProfileWithFallback(raw, fallback, anonymousLabel.value)

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
  }

  function clearProfileSubscription() {
    if (unsubscribeProfile) {
      unsubscribeProfile()
      unsubscribeProfile = null
    }
  }

  function bindProfileForUser(authUser) {
    const userId = authUser?.uid ? String(authUser.uid).trim() : ''

    if (!userId) {
      if (activeProfileUid !== null) {
        clearProfileSubscription()
      }
      activeProfileUid = null
      profile.value = null
      friendCodeAttemptedForUid = null
      friendCodeAttemptInFlight = false
      baselineProfileAttemptedForUid = null
      baselineProfileAttemptInFlight = false
      latestHydratedUid = null

      const latestRecordStore = useLatestRecordStore()
      latestRecordStore.reset()
      clearLastAccessedRecordId()
      return
    }

    if (activeProfileUid === userId && unsubscribeProfile) {
      return
    }

    clearProfileSubscription()
    activeProfileUid = userId

    friendCodeAttemptedForUid = null
    friendCodeAttemptInFlight = false
    baselineProfileAttemptedForUid = null
    baselineProfileAttemptInFlight = false

    const fallback = resolveFallbackProfile(authUser)
    profile.value = normalizeProfileWithFallback(null, fallback, anonymousLabel.value)

    const latestRecordStore = useLatestRecordStore()
    if (latestHydratedUid !== userId) {
      latestHydratedUid = userId
      try {
        void latestRecordStore.hydrateLatestRecord(userId, {
          preferredRecordId: readLastAccessedRecordId()
        })
      } catch {
        void latestRecordStore.fetchLatestRecord(userId)
      }
    }

    unsubscribeProfile = subscribeUserProfile({
      userId,
      fallbackProfile: fallback,
      onData: (profileData) => {
        if (String(auth.currentUser?.uid || '') !== userId) return
        applyProfileFromSnapshot(profileData, auth.currentUser, userId)
      },
      onError: (error) => {
        console.error('userProfileStore: profile listener failed', error)
        if (String(auth.currentUser?.uid || '') === userId) {
          profile.value = normalizeProfileWithFallback(null, fallback, anonymousLabel.value)
        }
      }
    })
  }

  function handleAuthUser(nextUser) {
    currentUser.value = nextUser || null
    bindProfileForUser(nextUser || null)
  }

  /**
   * Start a single auth listener for the whole app.
   * Safe to call multiple times.
   */
  function start() {
    if (started) return
    started = true

    void getAuthStateReadyPromise().then(() => {
      if (currentUser.value === undefined) {
        handleAuthUser(auth.currentUser)
      }
    })

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      handleAuthUser(user)
    })
  }

  function stop() {
    if (typeof unsubscribeAuth === 'function') unsubscribeAuth()
    unsubscribeAuth = null
    clearProfileSubscription()
    started = false
    currentUser.value = undefined
    profile.value = null
    latestHydratedUid = null
    activeProfileUid = null
  }

  watch(anonymousLabel, () => {
    const user = currentUser.value
    if (!user?.uid) return
    const userId = String(user.uid)
    const raw = profile.value && typeof profile.value === 'object' ? profile.value : null
    applyProfileFromSnapshot(raw, user, userId)
  })

  function refreshLatestRecord() {
    const uid = currentUser.value?.uid
    if (!uid) return Promise.resolve(null)
    return useLatestRecordStore().fetchLatestRecord(uid)
  }

  return {
    currentUser,
    profile,
    loading,
    authReady,
    setAnonymousLabel,
    start,
    stop,
    refreshLatestRecord
  }
})
