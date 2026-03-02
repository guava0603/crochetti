import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'

import { auth } from '@/firebaseConfig'
import { db } from '@/firebaseConfig'
import { fetchAllAchievements, fetchEarnedAchievements } from '@/services/firestore/achievements'
import { checkAndAwardAchievements } from '@/services/achievementService'

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} [category]
 * @property {string} [tier]
 * @property {string} [nameKey]
 * @property {string} [descriptionKey]
 * @property {string} name
 * @property {string} description
 * @property {string} iconUrl
 * @property {string} conditionType
 */

/**
 * @typedef {Object} EarnedAchievement
 * @property {string} id
 * @property {string|null} earnedAt ISO timestamp
 */

let started = false
let unsubscribeAuth = null

export const useAchievementStore = defineStore('achievement', () => {
  /** @type {import('vue').Ref<Record<string, Achievement>>} */
  const achievementsById = ref({})

  /** @type {import('vue').Ref<Record<string, EarnedAchievement>>} */
  const earnedById = ref({})

  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  const awarding = ref(false)

  function timestampToMs(value) {
    if (!value) return null
    if (value instanceof Timestamp) return value.toMillis()
    if (value instanceof Date) {
      const ms = value.getTime()
      return Number.isFinite(ms) ? ms : null
    }
    if (typeof value === 'string') {
      const s = value.trim()
      if (!s) return null
      const ms = new Date(s).getTime()
      return Number.isFinite(ms) ? ms : null
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }
    return null
  }

  function computeLatestPublishMarker(list) {
    const achievementsList = Array.isArray(list) ? list : []

    let maxPublishedMs = null
    let maxVersion = null

    for (const a of achievementsList) {
      const ms = timestampToMs(a?.publishedDate)
      if (ms != null) {
        maxPublishedMs = maxPublishedMs == null ? ms : Math.max(maxPublishedMs, ms)
      }

      const v = a?.version
      const vn = v == null ? null : Number(v)
      if (vn != null && Number.isFinite(vn)) {
        maxVersion = maxVersion == null ? vn : Math.max(maxVersion, vn)
      }
    }

    return { maxPublishedMs, maxVersion }
  }

  async function getUserAchievementCheckState(uid) {
    const userRef = doc(db, 'users', String(uid))
    const snap = await getDoc(userRef)
    if (!snap.exists()) return { lastCheckMs: null, lastVersionSeen: null }
    const data = snap.data() || {}
    return {
      lastCheckMs: timestampToMs(data.lastAchievementCheck),
      lastVersionSeen: data.lastAchievementVersionSeen == null ? null : Number(data.lastAchievementVersionSeen)
    }
  }

  async function updateUserAchievementCheckState(uid, { maxVersion }) {
    const userRef = doc(db, 'users', String(uid))
    const payload = { lastAchievementCheck: serverTimestamp() }
    if (maxVersion != null && Number.isFinite(Number(maxVersion))) {
      payload.lastAchievementVersionSeen = Number(maxVersion)
    }
    await setDoc(userRef, payload, { merge: true })
  }

  /**
   * Toast queue for newly-earned achievements.
   * Items are shaped like achievements (name/description/iconUrl) plus `id`.
   */
  const toastQueue = ref([])

  const achievements = computed(() => Object.values(achievementsById.value))

  const earnedAchievementIds = computed(() => new Set(Object.keys(earnedById.value)))

  const activeToast = computed(() => {
    const q = toastQueue.value
    return Array.isArray(q) && q.length ? q[0] : null
  })

  const earnedAchievements = computed(() => {
    const earned = earnedById.value
    const out = []

    for (const id of Object.keys(earned)) {
      const earnedItem = earned[id]
      const a = achievementsById.value[id]
      const merged = {
        id,
        earnedAt: earnedItem?.earnedAt || null
      }
      if (a && typeof a === 'object') Object.assign(merged, a)
      out.push(merged)
    }

    // Newest first where possible.
    out.sort((x, y) => {
      const ax = x.earnedAt ? new Date(x.earnedAt).getTime() : 0
      const ay = y.earnedAt ? new Date(y.earnedAt).getTime() : 0
      return ay - ax
    })

    return out
  })

  function reset() {
    earnedById.value = {}
    loaded.value = false
    error.value = ''
    loading.value = false
    toastQueue.value = []
  }

  function enqueueAchievementToasts(ids) {
    const list = Array.isArray(ids) ? ids : []
    if (!list.length) return

    const existing = new Set((toastQueue.value || []).map((x) => String(x?.id || '')).filter(Boolean))

    const next = (toastQueue.value || []).slice()

    for (const rawId of list) {
      const id = rawId != null ? String(rawId).trim() : ''
      if (!id) continue
      if (existing.has(id)) continue

      const a = achievementsById.value[id]
      const item = { id }
      if (a && typeof a === 'object') Object.assign(item, a)
      next.push(item)
      existing.add(id)
    }

    toastQueue.value = next
  }

  function dismissActiveToast() {
    const q = toastQueue.value
    if (!Array.isArray(q) || q.length === 0) return
    toastQueue.value = q.slice(1)
  }

  async function fetchGlobalAchievements() {
    const list = await fetchAllAchievements()

    const next = {}
    for (const a of list) {
      if (!a?.id) continue
      next[String(a.id)] = a
    }

    achievementsById.value = next
    return list
  }

  /**
   * Fetch user's earned achievements and cache in store.
   *
   * Call this when auth state is ready.
   */
  async function fetchUserAchievements(userId) {
    const uid = userId != null ? String(userId).trim() : ''
    if (!uid) {
      reset()
      return []
    }

    loading.value = true
    error.value = ''

    try {
      // Fetch global list first so UI can render labels/icons.
      await fetchGlobalAchievements()

      const earnedList = await fetchEarnedAchievements(uid)
      const next = {}
      for (const e of earnedList) {
        if (!e?.id) continue
        next[String(e.id)] = {
          id: String(e.id),
          earnedAt: e.earnedAt || null
        }
      }
      earnedById.value = next
      loaded.value = true
      return earnedList
    } catch (e) {
      console.error('achievementStore.fetchUserAchievements failed:', e)
      error.value = e?.message ? String(e.message) : 'Failed to fetch achievements'
      loaded.value = false
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Scan user data and award any newly-earned achievements.
   * Enqueues toast notifications for newly awarded IDs.
   */
  async function scanAndAwardNow(userId) {
    const uid = userId != null ? String(userId).trim() : (auth.currentUser?.uid || '')
    if (!uid) return { awardedIds: [] }
    if (awarding.value) return { awardedIds: [] }

    awarding.value = true

    try {
      if (!Object.keys(achievementsById.value).length) {
        await fetchGlobalAchievements()
      }

      const awarded = await checkAndAwardAchievements({
        userId: uid,
        achievements: achievements.value,
        earnedIds: new Set(Object.keys(earnedById.value))
      })

      if (awarded?.awardedIds?.length) {
        enqueueAchievementToasts(awarded.awardedIds)
        await fetchUserAchievements(uid)
      }

      return awarded
    } finally {
      awarding.value = false
    }
  }

  /**
   * Retroactive (expensive) scan gate:
   * Only run when latest published achievement is newer than user's last check.
   */
  async function retroactiveScanIfNeeded(userId) {
    const uid = userId != null ? String(userId).trim() : (auth.currentUser?.uid || '')
    if (!uid) return { awardedIds: [], skipped: true }

    if (!Object.keys(achievementsById.value).length) {
      await fetchGlobalAchievements()
    }

    const { maxPublishedMs, maxVersion } = computeLatestPublishMarker(achievements.value)
    const { lastCheckMs, lastVersionSeen } = await getUserAchievementCheckState(uid)

    if (maxPublishedMs != null && lastCheckMs != null && maxPublishedMs <= lastCheckMs) {
      return { awardedIds: [], skipped: true }
    }

    if (maxPublishedMs == null && maxVersion != null && lastVersionSeen != null && maxVersion <= lastVersionSeen) {
      return { awardedIds: [], skipped: true }
    }

    const result = await scanAndAwardNow(uid)
    await updateUserAchievementCheckState(uid, { maxVersion })
    return { ...result, skipped: false }
  }

  /**
   * Start listening to auth changes and load earned achievements.
   * Safe to call multiple times.
   */
  function start() {
    if (started) return
    started = true

    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        reset()
        return
      }

      await fetchUserAchievements(user.uid)

      // Retroactive scan: if new achievements were published after the user already
      // satisfied conditions, award them on next login.
      try {
        await retroactiveScanIfNeeded(user.uid)
      } catch (e) {
        // Non-blocking: the app can function without achievements.
        console.warn('achievementStore: checkAndAwardAchievements failed:', e)
      }
    })
  }

  function stop() {
    if (typeof unsubscribeAuth === 'function') unsubscribeAuth()
    unsubscribeAuth = null
    started = false
  }

  return {
    // state
    achievementsById,
    earnedById,
    loading,
    loaded,
    error,
    awarding,

    // getters
    achievements,
    earnedAchievements,
    earnedAchievementIds,
    activeToast,

    // actions
    fetchGlobalAchievements,
    fetchUserAchievements,
    scanAndAwardNow,
    retroactiveScanIfNeeded,
    enqueueAchievementToasts,
    dismissActiveToast,
    start,
    stop,
    reset
  }
})
