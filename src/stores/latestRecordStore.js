import { defineStore } from 'pinia'
import { ref } from 'vue'

import { fetchUserRecord, listUserRecordSummaries } from '@/services/firestore/records'

export const useLatestRecordStore = defineStore('latestRecord', () => {
  const latestRecordData = ref(null)
  const loading = ref(false)
  const error = ref(null)

  let fetchToken = 0

  function setLatestRecordData(next) {
    latestRecordData.value = next && typeof next === 'object' ? next : null
  }

  function reset() {
    fetchToken += 1
    latestRecordData.value = null
    loading.value = false
    error.value = null
  }

  async function fetchLatestRecord(uid) {
    const userId = String(uid || '').trim()
    if (!userId) {
      reset()
      return null
    }

    const token = ++fetchToken
    loading.value = true
    error.value = null

    try {
      const list = await listUserRecordSummaries(userId)
      if (token !== fetchToken) return null

      const top = Array.isArray(list) && list.length ? list[0] : null
      const id = top?.id
      if (!id) {
        latestRecordData.value = null
        return null
      }

      const full = await fetchUserRecord(userId, String(id))
      if (token !== fetchToken) return null

      // Preserve the record id (doc id) on the returned object so UIs can navigate/update.
      const withId = full && typeof full === 'object' ? { ...full, id: String(id) } : null
      latestRecordData.value = withId
      return withId
    } catch (e) {
      if (token !== fetchToken) return null
      console.error('latestRecordStore: fetchLatestRecord failed', e)
      error.value = e
      latestRecordData.value = null
      return null
    } finally {
      if (token === fetchToken) loading.value = false
    }
  }

  async function fetchRecordById(uid, recordId) {
    const userId = String(uid || '').trim()
    const rid = String(recordId || '').trim()
    if (!userId || !rid) return null

    const token = ++fetchToken
    loading.value = true
    error.value = null

    try {
      const full = await fetchUserRecord(userId, rid)
      if (token !== fetchToken) return null

      if (!full || typeof full !== 'object') {
        latestRecordData.value = null
        return null
      }

      // Preserve the record id (doc id) on the returned object so UIs can navigate/update.
      full.id = rid
      latestRecordData.value = full
      return full
    } catch (e) {
      if (token !== fetchToken) return null
      console.error('latestRecordStore: fetchRecordById failed', e)
      error.value = e
      latestRecordData.value = null
      return null
    } finally {
      if (token === fetchToken) loading.value = false
    }
  }

  /**
   * Hydrate the dock record for a signed-in user.
   * Prefers a specific record id (e.g. last accessed) and falls back to the most recent record.
   */
  async function hydrateLatestRecord(uid, { preferredRecordId = null } = {}) {
    const userId = String(uid || '').trim()
    if (!userId) {
      reset()
      return null
    }

    const preferredId = String(preferredRecordId || '').trim()
    if (preferredId) {
      const r = await fetchRecordById(userId, preferredId)
      if (r) return r
    }

    return await fetchLatestRecord(userId)
  }

  return {
    latestRecordData,
    loading,
    error,
    fetchLatestRecord,
    fetchRecordById,
    hydrateLatestRecord,
    reset,
    setLatestRecordData
  }
})
