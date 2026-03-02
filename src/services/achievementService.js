import { auth, db } from '@/firebaseConfig'
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore'

import { listUserRecords } from '@/services/firestore/records'
import { fetchAllAchievements, fetchEarnedAchievements } from '@/services/firestore/achievements'
import { ACHIEVEMENT_EVALUATORS } from '@/services/achievements/evaluators'

function toMs(iso) {
  if (!iso) return null
  const ms = new Date(String(iso)).getTime()
  return Number.isFinite(ms) ? ms : null
}

function getSlotDurationMs(slot, { includeOngoing = false, nowMs = Date.now() } = {}) {
  const startMs = toMs(slot?.start)
  if (startMs == null) return 0

  // For retroactive awarding we want deterministic results, so by default we only
  // count finished slots that have an `end` timestamp.
  const endIso = slot?.end
  const endMs = endIso ? toMs(endIso) : (includeOngoing ? nowMs : null)
  if (endMs == null) return 0

  return Math.max(0, endMs - startMs)
}

function computeTotalEffortMs(records, opts) {
  const list = Array.isArray(records) ? records : []
  let sum = 0

  for (const record of list) {
    const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
    for (const slot of slots) {
      sum += getSlotDurationMs(slot, opts)
    }
  }

  return sum
}

async function fetchUserProjects(uid) {
  const projectsRef = collection(db, 'projects')
  const q = query(projectsRef, where('authorId', '==', String(uid)))
  const snap = await getDocs(q)
  return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()))
}

function shouldAward(achievement, { metrics, projects, records }) {
  const id = achievement?.id != null ? String(achievement.id).trim() : ''
  const evaluator = id ? ACHIEVEMENT_EVALUATORS?.[id] : null
  if (typeof evaluator === 'function') {
    return { ok: Boolean(evaluator({ achievement, metrics, projects, records })) }
  }

  const type = String(achievement?.conditionType || '').trim()
  const threshold = achievement?.conditionValue

  if (!type) return { ok: false, reason: 'missing conditionType' }
  if (threshold == null || !Number.isFinite(Number(threshold))) {
    return { ok: false, reason: 'missing conditionValue' }
  }

  if (type === 'total_projects') {
    return { ok: metrics.totalProjects >= Number(threshold) }
  }

  if (type === 'total_time') {
    // Convention: `conditionValue` is milliseconds for total_time.
    return { ok: metrics.totalTimeMs >= Number(threshold) }
  }

  return { ok: false, reason: `unsupported conditionType: ${type}` }
}

/**
 * Batch-check achievements and award any missing ones.
 *
 * This is designed for "retroactive" awarding: after you publish new achievements,
 * the next login can scan all existing projects/records and backfill earned badges.
 *
 * Firestore schema:
 * - catalog: local (code + i18n)
 * - per-user: `/users/{uid}/earnedAchievements/{achievementId}` (doc id is the claim)
 *
 * @param {object} [params]
 * @param {string} [params.userId] Defaults to current authed user's uid
 * @param {Array<object>} [params.achievements] Optional preloaded global achievements
 * @param {Set<string>} [params.earnedIds] Optional preloaded earned achievement IDs
 * @param {boolean} [params.includeOngoingSlots] Whether to count time slots without `end`
 * @param {boolean} [params.dryRun] If true, returns what would be awarded without writing
 * @returns {Promise<{checked:number, awardedIds:string[], alreadyEarned:number, metrics:{totalProjects:number,totalRecords:number,totalTimeMs:number}}>}
 */
export async function checkAndAwardAchievements(params = {}) {
  const uid = params.userId != null ? String(params.userId).trim() : (auth.currentUser?.uid || '')
  if (!uid) throw new Error('checkAndAwardAchievements: missing userId (not authenticated)')

  const includeOngoingSlots = Boolean(params.includeOngoingSlots)
  const dryRun = Boolean(params.dryRun)

  // Fetch core data.
  const [projects, records] = await Promise.all([
    fetchUserProjects(uid),
    listUserRecords(uid)
  ])

  const metrics = {
    totalProjects: Array.isArray(projects) ? projects.length : 0,
    totalRecords: Array.isArray(records) ? records.length : 0,
    totalTimeMs: computeTotalEffortMs(records, { includeOngoing: includeOngoingSlots })
  }

  const achievements = Array.isArray(params.achievements)
    ? params.achievements
    : await fetchAllAchievements()

  const earnedIds = params.earnedIds instanceof Set
    ? params.earnedIds
    : new Set((await fetchEarnedAchievements(uid)).map((e) => String(e?.id || '')).filter(Boolean))

  const toAward = []

  for (const a of achievements) {
    const id = a?.id != null ? String(a.id).trim() : ''
    if (!id) continue

    if (earnedIds.has(id)) continue

    const verdict = shouldAward(a, { metrics, projects, records })
    if (verdict.ok) {
      toAward.push(id)
    }
  }

  if (dryRun || toAward.length === 0) {
    return {
      checked: Array.isArray(achievements) ? achievements.length : 0,
      awardedIds: toAward,
      alreadyEarned: earnedIds.size,
      metrics
    }
  }

  // Batch write all awards in one commit.
  const batch = writeBatch(db)

  for (const achievementId of toAward) {
    const earnedDocRef = doc(db, 'users', String(uid), 'earnedAchievements', String(achievementId))
    batch.set(
      earnedDocRef,
      {
        earnedAt: serverTimestamp()
      },
      { merge: true }
    )
  }

  await batch.commit()

  return {
    checked: Array.isArray(achievements) ? achievements.length : 0,
    awardedIds: toAward,
    alreadyEarned: earnedIds.size,
    metrics
  }
}
