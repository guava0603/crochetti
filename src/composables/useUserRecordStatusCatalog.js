import { computed, unref } from 'vue'

import { updateUserProfile } from '@/services/firestore/user'
import {
  PROFILE_STATUS_CATALOG_FIELD,
  PROFILE_STATUS_NOTES_FIELD
} from '@/constants/recordStatusCatalog'
import {
  allocateNextCustomStatusId,
  appendNoteIfNew,
  findCatalogStatusById,
  findCatalogStatusByName,
  getNoteSuggestionsForStatus,
  linkStatusToRecordList,
  mergeRecordNotesIntoProfile,
  mergeRecordStatusesIntoCatalog,
  normalizeRecordLinkedStatuses,
  normalizeStatusCatalog,
  normalizeStatusNotes
} from '@/utils/recordStatusCatalog'

export function useUserRecordStatusCatalog(profileSource, userIdSource) {
  const profile = computed(() => {
    const raw = typeof profileSource === 'function' ? profileSource() : unref(profileSource)
    return raw && typeof raw === 'object' ? raw : null
  })

  const userId = computed(() => {
    const fromArg = typeof userIdSource === 'function' ? userIdSource() : unref(userIdSource)
    if (fromArg) return String(fromArg).trim()
    return String(profile.value?.uid || profile.value?.id || '').trim()
  })

  const catalog = computed(() => normalizeStatusCatalog(profile.value?.[PROFILE_STATUS_CATALOG_FIELD]))
  const notes = computed(() => normalizeStatusNotes(profile.value?.[PROFILE_STATUS_NOTES_FIELD]))

  async function persistCatalog(nextCatalog) {
    const uid = userId.value
    if (!uid) return false
    const normalized = normalizeStatusCatalog(nextCatalog)
    await updateUserProfile({
      userId: uid,
      profileData: { [PROFILE_STATUS_CATALOG_FIELD]: normalized }
    })
    if (profile.value) {
      profile.value[PROFILE_STATUS_CATALOG_FIELD] = normalized
    }
    return true
  }

  async function persistNotes(nextNotes) {
    const uid = userId.value
    if (!uid) return false
    const normalized = normalizeStatusNotes(nextNotes)
    await updateUserProfile({
      userId: uid,
      profileData: { [PROFILE_STATUS_NOTES_FIELD]: normalized }
    })
    if (profile.value) {
      profile.value[PROFILE_STATUS_NOTES_FIELD] = normalized
    }
    return true
  }

  async function ensureCatalogIncludesRecordStatuses(recordStatuses) {
    const merged = mergeRecordStatusesIntoCatalog(catalog.value, recordStatuses)
    if (merged.length === catalog.value.length) {
      let same = true
      for (let i = 0; i < merged.length; i += 1) {
        if (merged[i]?.id !== catalog.value[i]?.id || merged[i]?.name !== catalog.value[i]?.name) {
          same = false
          break
        }
      }
      if (same) return merged
    }
    await persistCatalog(merged)
    return merged
  }

  async function ensureNotesIncludeRecordNotes(recordNotes) {
    const merged = mergeRecordNotesIntoProfile(notes.value, recordNotes)
    if (merged.length === notes.value.length) {
      let same = true
      for (let i = 0; i < merged.length; i += 1) {
        const a = merged[i]
        const b = notes.value[i]
        if (Number(a?.status_id) !== Number(b?.status_id) || a?.description !== b?.description) {
          same = false
          break
        }
      }
      if (same) return merged
    }
    await persistNotes(merged)
    return merged
  }

  async function ensureProfileIncludesRecordStatusData(record) {
    if (!record || typeof record !== 'object') return
    await ensureCatalogIncludesRecordStatuses(record.self_defined_status)
    await ensureNotesIncludeRecordNotes(record.self_defined_status_notes)
  }

  async function addCustomStatus(name) {
    const trimmed = String(name || '').trim()
    if (!trimmed) return null

    const existing = findCatalogStatusByName(catalog.value, trimmed)
    if (existing) return existing

    const entry = { id: allocateNextCustomStatusId(catalog.value), name: trimmed }
    await persistCatalog([...catalog.value, entry])
    return entry
  }

  async function addCustomNote({ statusId, description }) {
    const next = appendNoteIfNew(notes.value, { statusId, description })
    if (next.length === notes.value.length) return next
    await persistNotes(next)
    return next
  }

  function resolveCustomStatusLabel(statusId) {
    const entry = findCatalogStatusById(catalog.value, statusId)
    return entry?.name ? String(entry.name) : ''
  }

  function getNotesForStatus(statusId) {
    return getNoteSuggestionsForStatus(notes.value, statusId)
  }

  function normalizeRecordLinked(recordStatuses) {
    return normalizeRecordLinkedStatuses(recordStatuses, catalog.value)
  }

  function linkStatusOnRecord(record, statusEntry) {
    if (!record || typeof record !== 'object' || !statusEntry) return []
    const next = linkStatusToRecordList(record.self_defined_status, statusEntry)
    record.self_defined_status = next
    return next
  }

  return {
    catalog,
    notes,
    ensureCatalogIncludesRecordStatuses,
    ensureNotesIncludeRecordNotes,
    ensureProfileIncludesRecordStatusData,
    addCustomStatus,
    addCustomNote,
    resolveCustomStatusLabel,
    findCatalogStatusById: (id) => findCatalogStatusById(catalog.value, id),
    getNotesForStatus,
    normalizeRecordLinked,
    linkStatusOnRecord
  }
}
