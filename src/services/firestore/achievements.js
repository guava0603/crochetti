import { auth, db } from '@/firebaseConfig'
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp
} from 'firebase/firestore'

import { getLocalAchievementById, listLocalAchievements } from '@/services/achievements/catalog'

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} [category] Category id (for grouping)
 * @property {string} [tier] Visual tier (brown|silver|gold|special)
 * @property {string} [nameKey] i18n key for localized name (preferred)
 * @property {string} [descriptionKey] i18n key for localized description (preferred)
 * @property {string} name
 * @property {string} description
 * @property {string} iconUrl
 * @property {string} conditionType
 * @property {number|null} [conditionValue] Numeric threshold used by conditionType (recommended unit depends on conditionType)
 * @property {string} [conditionUnit] Optional unit hint for conditionValue (e.g. 'ms', 'count')
 * @property {number|null} [version] Optional publish version number (monotonic)
 * @property {string|null} [publishedDate] Optional publish date (ISO)
 */

function timestampToIso(value) {
  if (!value) return null

  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }

  if (value instanceof Date) {
    const ms = value.getTime()
    if (!Number.isFinite(ms)) return null
    return value.toISOString()
  }

  // If you stored ISO strings previously.
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return null
    const ms = new Date(s).getTime()
    if (!Number.isFinite(ms)) return null
    return new Date(ms).toISOString()
  }

  return null
}

/**
 * Fetch global achievements.
 *
 * Architecture note: the catalog is local (code + i18n). Firestore is used only
 * for per-user earned achievement IDs.
 *
 * @returns {Promise<Achievement[]>}
 */
export async function fetchAllAchievements() {
  // Keep return type compatible with the previous Firestore-backed implementation.
  return listLocalAchievements().map((a) => ({
    id: String(a.id),
    category: String(a.category || ''),
    tier: String(a.tier || ''),
    nameKey: String(a.nameKey || ''),
    descriptionKey: String(a.descriptionKey || ''),
    name: '',
    description: '',
    iconUrl: '',
    conditionType: String(a.conditionType || ''),
    conditionValue: a.conditionValue == null ? null : Number(a.conditionValue),
    conditionUnit: a.conditionUnit ? String(a.conditionUnit) : '',
    version: a.version == null ? null : Number(a.version),
    publishedDate: null
  }))
}

/**
 * Fetch a single achievement by id.
 *
 * @param {string} achievementId
 * @returns {Promise<Achievement|null>}
 */
export async function fetchAchievementById(achievementId) {
  const id = achievementId != null ? String(achievementId).trim() : ''
  if (!id) throw new Error('fetchAchievementById: missing achievementId')

  const a = getLocalAchievementById(id)
  if (!a) return null
  return {
    id: String(a.id),
    category: String(a.category || ''),
    tier: String(a.tier || ''),
    nameKey: String(a.nameKey || ''),
    descriptionKey: String(a.descriptionKey || ''),
    name: '',
    description: '',
    iconUrl: '',
    conditionType: String(a.conditionType || ''),
    conditionValue: a.conditionValue == null ? null : Number(a.conditionValue),
    conditionUnit: a.conditionUnit ? String(a.conditionUnit) : '',
    version: a.version == null ? null : Number(a.version),
    publishedDate: null
  }
}

/**
 * Fetch earned achievements for user in `/users/{uid}/earnedAchievements`.
 *
 * Each document is expected to be keyed by achievementId, with fields:
 * - earnedAt: Firestore Timestamp (recommended) or ISO string
 *
 * @param {string} userId
 * @returns {Promise<Array<{id: string, earnedAt: string|null}>>}
 */
export async function fetchEarnedAchievements(userId) {
  const uid = userId != null ? String(userId).trim() : ''
  if (!uid) throw new Error('fetchEarnedAchievements: missing userId')

  const earnedRef = collection(db, 'users', uid, 'earnedAchievements')
  const snap = await getDocs(earnedRef)

  return snap.docs
    .map((d) => {
      const data = d.data() || {}
      return {
        id: d.id,
        earnedAt: timestampToIso(data.earnedAt)
      }
    })
    .filter((x) => x.id)
}

/**
 * Fetch "achievement cabinet" data for a user:
 * - all global achievements (name/description/iconUrl/...)
 * - merged with per-user earnedAt + derived isEarned
 *
 * This keeps UI components thin and ensures consistent merging.
 *
 * @param {string} userId
 * @returns {Promise<Array<Achievement & {isEarned: boolean, earnedAt: string|null}>>}
 */
export async function fetchAchievementCabinet(userId) {
  const uid = userId != null ? String(userId).trim() : ''
  if (!uid) throw new Error('fetchAchievementCabinet: missing userId')

  const [achievements, earned] = await Promise.all([
    fetchAllAchievements(),
    fetchEarnedAchievements(uid).catch(() => [])
  ])

  const earnedById = {}
  for (const e of earned) {
    if (!e?.id) continue
    earnedById[String(e.id)] = { earnedAt: e.earnedAt || null }
  }

  return (Array.isArray(achievements) ? achievements : [])
    .map((a) => {
      const id = String(a?.id || '')
      const earnedDoc = earnedById[id] || null
      const earnedAt = earnedDoc?.earnedAt || null
      return {
        ...a,
        id,
        // Important: treat existence of an earned doc as earned even if `earnedAt` is missing.
        isEarned: Boolean(earnedDoc),
        earnedAt
      }
    })
    .filter((x) => x.id)
}

/**
 * Mark an achievement as earned for a user.
 * Safe to call multiple times.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.achievementId
 * @param {string|Date|import('firebase/firestore').Timestamp|null} [params.earnedAt]
 */
export async function upsertEarnedAchievement({ userId, achievementId, earnedAt = null }) {
  const uid = userId != null ? String(userId).trim() : ''
  const id = achievementId != null ? String(achievementId).trim() : ''
  if (!uid) throw new Error('upsertEarnedAchievement: missing userId')
  if (!id) throw new Error('upsertEarnedAchievement: missing achievementId')

  const earnedDocRef = doc(db, 'users', uid, 'earnedAchievements', id)

  const resolvedEarnedAt = earnedAt
    ? earnedAt
    : serverTimestamp()

  await setDoc(
    earnedDocRef,
    {
      earnedAt: resolvedEarnedAt
    },
    { merge: true }
  )

  return true
}

/**
 * Convenience: upsert earned achievement for current authed user.
 *
 * @param {string} achievementId
 */
export async function upsertMyEarnedAchievement(achievementId) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('upsertMyEarnedAchievement: not authenticated')
  return upsertEarnedAchievement({ userId: uid, achievementId })
}
