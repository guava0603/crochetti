import { storeToRefs } from 'pinia'

import { useLatestRecordStore } from '@/stores/latestRecordStore'
import { useUserProfileStore } from '@/stores/userProfileStore'

/**
 * Shared current-user profile state (Pinia singleton).
 *
 * - `currentUser`: undefined until auth restores, then null or Firebase user
 * - `profile`: Firestore profile with auth fallback applied immediately
 * - `loading`: true only while auth is still pending (not while Firestore syncs)
 */
export function useCurrentUserProfile(options = {}) {
  const store = useUserProfileStore()
  const latestRecordStore = useLatestRecordStore()

  if (options?.anonymousLabel) {
    store.setAnonymousLabel(options.anonymousLabel)
  }

  store.start()

  const { currentUser, profile, loading } = storeToRefs(store)

  return {
    currentUser,
    profile,
    loading,
    latestRecordData: latestRecordStore.latestRecordData,
    latestRecordLoading: latestRecordStore.loading,
    refreshLatestRecord: () => store.refreshLatestRecord()
  }
}
