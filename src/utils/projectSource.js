import { toTrimmedText as toText } from '@/utils/text'

export function buildProjectSourceFromCopyFrom(copyFrom) {
  const raw = typeof copyFrom === 'string' ? copyFrom : ''
  const ids = raw
    .split(',')
    .map((x) => toText(x))
    .filter(Boolean)

  if (!ids.length) return null

  return {
    type: 'copy',
    source_project_ids: ids
  }
}

