// Optional per-achievement custom logic.
//
// Most achievements can be expressed via the Firestore fields:
// - conditionType
// - conditionValue
//
// For anything more complex, add an evaluator here keyed by achievement `id`.
//
// Evaluator signature:
// (ctx) => boolean
// where ctx contains:
// - achievement: the catalog item (from Firestore)
// - metrics: computed totals
// - projects: raw project docs
// - records: raw record docs

/**
 * @typedef {Object} AchievementMetrics
 * @property {number} totalProjects
 * @property {number} totalRecords
 * @property {number} totalTimeMs
 */

/**
 * @typedef {Object} AchievementEvalContext
 * @property {any} achievement
 * @property {AchievementMetrics} metrics
 * @property {Array<any>} projects
 * @property {Array<any>} records
 */

/** @type {Record<string, (ctx: AchievementEvalContext) => boolean>} */
export const ACHIEVEMENT_EVALUATORS = {
  // Example:
  // streak_7_days: ({ records }) => {
  //   // implement your own logic
  //   return false
  // }

  /**
   * Complete 5 records for the same project within one local calendar day.
   */
  special_same_project_5_in_day: ({ records }) => {
    const list = Array.isArray(records) ? records : []

    const counts = new Map()

    for (const r of list) {
      if (!r || r.is_completed !== true) continue
      const projectId = r.project_id != null ? String(r.project_id).trim() : ''
      if (!projectId) continue

      const completedMs = getRecordCompletedMs(r)
      if (completedMs == null) continue

      const dayKey = localDayKey(completedMs)
      const key = `${dayKey}__${projectId}`
      const next = (counts.get(key) || 0) + 1
      if (next >= 5) return true
      counts.set(key, next)
    }

    return false
  },

  /**
   * Start a new record when there are already 10 ongoing records.
   * (Retroactive approximation using created_at + completed_at time range.)
   */
  special_start_record_with_10_ongoing: ({ records }) => {
    const list = Array.isArray(records) ? records : []
    const intervals = []

    for (const r of list) {
      if (!r) continue
      const id = r.id != null ? String(r.id) : ''
      const startMs = getRecordStartMs(r)
      if (startMs == null) continue
      const endMs = r.is_completed === true ? getRecordCompletedMs(r) : null
      intervals.push({ id, startMs, endMs })
    }

    for (const current of intervals) {
      const t = current.startMs
      let ongoingBeforeStart = 0

      for (const other of intervals) {
        if (other === current) continue
        if (other.startMs > t) continue
        if (other.endMs != null && other.endMs <= t) continue
        ongoingBeforeStart += 1
        if (ongoingBeforeStart >= 10) return true
      }
    }

    return false
  },

  /**
   * Complete 5 different projects within any rolling 1-day window.
   */
  special_5_projects_1_days: ({ records }) => {
    const list = Array.isArray(records) ? records : []
    const completions = []

    for (const r of list) {
      if (!r || r.is_completed !== true) continue
      const projectId = r.project_id != null ? String(r.project_id).trim() : ''
      if (!projectId) continue

      const completedMs = getRecordCompletedMs(r)
      if (completedMs == null) continue
      completions.push({ ms: completedMs, projectId })
    }

    completions.sort((a, b) => a.ms - b.ms)
    const windowMs = 1 * 24 * 60 * 60 * 1000

    const countsByProject = new Map()
    let i = 0

    for (let j = 0; j < completions.length; j += 1) {
      const pj = completions[j].projectId
      countsByProject.set(pj, (countsByProject.get(pj) || 0) + 1)

      while (i <= j && completions[j].ms - completions[i].ms > windowMs) {
        const pi = completions[i].projectId
        const next = (countsByProject.get(pi) || 0) - 1
        if (next <= 0) countsByProject.delete(pi)
        else countsByProject.set(pi, next)
        i += 1
      }

      if (countsByProject.size >= 5) return true
    }

    return false
  }
}

function toMs(value) {
  if (!value) return null

  // Firestore Timestamp-like
  if (value && typeof value.toMillis === 'function') {
    const ms = value.toMillis()
    return Number.isFinite(ms) ? ms : null
  }

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

function localDayKey(ms) {
  const d = new Date(ms)
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getRecordStartMs(record) {
  // Prefer created_at; fallback to earliest slot start.
  const created = toMs(record?.created_at)
  if (created != null) return created

  const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
  let best = null
  for (const s of slots) {
    const ms = toMs(s?.start)
    if (ms == null) continue
    best = best == null ? ms : Math.min(best, ms)
  }
  return best
}

function getRecordCompletedMs(record) {
  // Prefer explicit completed_at; fallback to latest slot end; fallback to updated_at.
  const explicit = toMs(record?.completed_at)
  if (explicit != null) return explicit

  const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
  let best = null
  for (const s of slots) {
    const ms = toMs(s?.end)
    if (ms == null) continue
    best = best == null ? ms : Math.max(best, ms)
  }
  if (best != null) return best

  const updated = toMs(record?.updated_at)
  return updated
}
