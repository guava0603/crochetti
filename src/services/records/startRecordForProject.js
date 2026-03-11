import { v4 as uuidv4 } from '@lukeed/uuid'

import { normalizeComponentListForRecord } from '@/utils/componentInstances'
import { addRecordToProjectOngoing } from '@/services/firestore/projects'
import { setUserRecord } from '@/services/firestore/records'

export function buildNewRecordForProject({
  projectId,
  projectName,
  projectImage,
  componentList,
  nowIso = new Date().toISOString(),
  recordId = uuidv4(),
} = {}) {
  const pid = projectId != null ? String(projectId).trim() : ''
  if (!pid) throw new Error('buildNewRecordForProject: projectId is required')

  const name = String(projectName || '')
  const image = projectImage != null ? String(projectImage).trim() : ''
  const list = Array.isArray(componentList) ? componentList : []

  const recordData = {
    project_id: pid,
    project_name: name,
    component_list: normalizeComponentListForRecord(list),
    time_slots: [],
    self_defined_status: [],
    // Use client timestamp for immediate achievement evaluation.
    created_at: nowIso,
    // Used to determine whether "更新專案" should be enabled.
    // On create, treat the record as synced to its initial project snapshot.
    synced_at: nowIso,
  }

  if (image) recordData.project_image = image

  return {
    recordId,
    recordData,
  }
}

export async function startRecordForProject({
  uid,
  projectId,
  projectName,
  projectImage,
  componentList,
  nowIso,
} = {}) {
  const userId = uid != null ? String(uid).trim() : ''
  if (!userId) throw new Error('startRecordForProject: uid is required')

  const { recordId, recordData } = buildNewRecordForProject({
    projectId,
    projectName,
    projectImage,
    componentList,
    nowIso,
  })

  await setUserRecord(userId, recordId, recordData)

  let trackingAdded = false
  try {
    await addRecordToProjectOngoing(projectId, recordId)
    trackingAdded = true
  } catch (error) {
    // Non-blocking (may fail for private projects / rules).
    console.warn('[project record tracking] failed to add ongoing record:', error)
  }

  return { recordId, recordData, trackingAdded }
}
