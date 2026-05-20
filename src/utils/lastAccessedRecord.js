import { getAppId } from '@/utils/appId'

function storageKey() {
  // Namespace by Firebase project id to avoid cross-env collisions.
  const appId = String(getAppId() || '').trim()
  return appId ? `${appId}:lastAccessedRecordId` : 'lastAccessedRecordId'
}

export function readLastAccessedRecordId() {
  try {
    const raw = window?.localStorage?.getItem?.(storageKey())
    const id = typeof raw === 'string' ? raw.trim() : ''
    return id || null
  } catch {
    return null
  }
}

export function writeLastAccessedRecordId(recordId) {
  try {
    const id = String(recordId || '').trim()
    if (!id) return
    window?.localStorage?.setItem?.(storageKey(), id)
  } catch {
    // ignore
  }
}

export function clearLastAccessedRecordId() {
  try {
    window?.localStorage?.removeItem?.(storageKey())
  } catch {
    // ignore
  }
}
