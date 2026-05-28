import { findOriginalStatus } from '@/constants/status'
import { findCatalogStatusById, normalizeRecordLinkedStatuses } from '@/utils/recordStatusCatalog'

export function resolveRecordStatusLabel(statusId, { t, userCatalog, recordLinked } = {}) {
  if (statusId == null) return '-'

  const original = findOriginalStatus(statusId)
  if (original?.nameKey && typeof t === 'function') return t(original.nameKey)

  const id = Number(statusId)
  if (!Number.isFinite(id)) return '-'

  const linked = normalizeRecordLinkedStatuses(recordLinked, userCatalog)
  const fromRecord = linked.find((s) => s.id === id)
  if (fromRecord?.name) return fromRecord.name

  const fromCatalog = findCatalogStatusById(userCatalog, id)
  if (fromCatalog?.name) return fromCatalog.name

  return String(statusId)
}
