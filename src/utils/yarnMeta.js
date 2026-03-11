import { v4 as uuidv4 } from '@lukeed/uuid'

function toText(v) {
  return String(v ?? '').trim()
}

function normalizeTypeKey(type) {
  return toText(type).toLowerCase()
}

export function normalizeYarnMetaList(rawList) {
  const list = Array.isArray(rawList) ? rawList : []
  const out = []
  const seenType = new Set()

  for (const item of list) {
    if (typeof item === 'string') {
      const type = toText(item)
      if (!type) continue
      const key = normalizeTypeKey(type)
      if (seenType.has(key)) continue
      seenType.add(key)
      out.push({ id: uuidv4(), type, amount: '' })
      continue
    }

    if (!item || typeof item !== 'object') continue

    const type = toText(item.type)
    const amount = toText(item.amount)
    if (!type) continue

    const key = normalizeTypeKey(type)
    if (seenType.has(key)) {
      const existing = out.find((x) => normalizeTypeKey(x?.type) === key)
      if (existing && !toText(existing.amount) && amount) existing.amount = amount
      continue
    }

    seenType.add(key)
    out.push({
      id: toText(item.id) || uuidv4(),
      type,
      amount
    })
  }

  return out
}

export function mergeYarnMetaWithTypes(yarnMetaList, extraTypes) {
  const base = normalizeYarnMetaList(yarnMetaList)
  const types = Array.isArray(extraTypes) ? extraTypes : []

  const seen = new Set(base.map((x) => normalizeTypeKey(x?.type)))

  for (const raw of types) {
    const type = toText(raw)
    if (!type) continue
    const key = normalizeTypeKey(type)
    if (seen.has(key)) continue
    seen.add(key)
    base.push({ id: uuidv4(), type, amount: '' })
  }

  return base
}

export function yarnMetaIdMap(yarnMetaList) {
  const map = new Map()
  for (const item of normalizeYarnMetaList(yarnMetaList)) {
    const id = toText(item?.id)
    if (!id) continue
    if (!map.has(id)) map.set(id, item)
  }
  return map
}

export function yarnMetaTypeMap(yarnMetaList) {
  const map = new Map()
  for (const item of normalizeYarnMetaList(yarnMetaList)) {
    const key = normalizeTypeKey(item?.type)
    if (!key) continue
    if (!map.has(key)) map.set(key, item)
  }
  return map
}

export function yarnMetaOptions(yarnMetaList) {
  const list = normalizeYarnMetaList(yarnMetaList)
  return list
    .map((m) => ({ value: toText(m.id), label: toText(m.type) }))
    .filter((o) => o.value && o.label)
}

export function normalizeComponentYarnSelection(rawSelection, yarnMetaList) {
  const idMap = yarnMetaIdMap(yarnMetaList)
  const typeMap = yarnMetaTypeMap(yarnMetaList)

  const rawList = Array.isArray(rawSelection)
    ? rawSelection
    : (typeof rawSelection === 'string' ? [rawSelection] : [])

  const seen = new Set()
  const out = []

  for (const raw of rawList) {
    const v = toText(raw)
    if (!v) continue

    // Already an id.
    if (idMap.has(v)) {
      if (!seen.has(v)) {
        seen.add(v)
        out.push(v)
      }
      continue
    }

    // Legacy: treat as type text.
    const byType = typeMap.get(normalizeTypeKey(v))
    const id = toText(byType?.id)
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }

  return out
}

export function yarnDisplayLines(yarnSelection, yarnMetaList) {
  const ids = Array.isArray(yarnSelection) ? yarnSelection : []
  const idMap = yarnMetaIdMap(yarnMetaList)

  const out = []
  const seen = new Set()

  for (const rawId of ids) {
    const id = toText(rawId)
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)

    const meta = idMap.get(id)
    if (!meta) {
      out.push(id)
      continue
    }

    const type = toText(meta.type)
    const amount = toText(meta.amount)
    if (!type) continue

    out.push(amount ? `${type}: ${amount}` : type)
  }

  return out
}

export function yarnMetaUsageCount(componentList, yarnMeta) {
  const list = Array.isArray(componentList) ? componentList : []
  const id = toText(yarnMeta?.id)
  const typeKey = normalizeTypeKey(yarnMeta?.type)

  let count = 0
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    if (c.type && c.type !== 'component') continue

    const selected = [
      ...(Array.isArray(c.yarn) ? c.yarn : []),
      ...(Array.isArray(c?.metadata?.yarn) ? c.metadata.yarn : [])
    ]
    if (id && selected.some((x) => toText(x) === id)) {
      count += 1
      continue
    }

    // Legacy: selection stored as type text.
    if (typeKey && selected.some((x) => normalizeTypeKey(x) === typeKey)) {
      count += 1
    }
  }

  return count
}

export function removeYarnMetaFromComponents(componentList, yarnMeta) {
  const list = Array.isArray(componentList) ? componentList : []
  const id = toText(yarnMeta?.id)
  const typeKey = normalizeTypeKey(yarnMeta?.type)

  return list.map((c) => {
    if (!c || typeof c !== 'object') return c
    if (c.type && c.type !== 'component') return c

    const prev = Array.isArray(c.yarn) ? c.yarn : []
    const next = prev.filter((x) => {
      const v = toText(x)
      if (id && v === id) return false
      if (typeKey && normalizeTypeKey(v) === typeKey) return false
      return true
    })

    if (next.length === prev.length) return c

    const nextMeta = c.metadata && typeof c.metadata === 'object'
      ? { ...c.metadata, yarn: next }
      : c.metadata

    return { ...c, yarn: next, metadata: nextMeta }
  })
}
