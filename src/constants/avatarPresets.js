// Central list of selectable preset avatars.
//
// Storage format:
// - preset avatar selection is stored as a simple id: e.g. "001-elephant"
// - "" means "use default" (usually provider photo or fallback letter)
//
// Backward compatibility:
// - older values may be stored as "/assets/image/avatar/<file>" (old folder)
//   or "/assets/image/avatar/wildlife/<file>".

export const AVATAR_FILES = [
  '001-cat.svg',
  '001-ostrich.svg',
  '002-fox.svg',
  '002-giraffe.svg',
  '003-monkey.svg',
  '003-squirrel.svg',
  '004-duck.svg',
  '004-rabbit.svg',
  '005-raccoon.svg',
  '005-turtle.svg',
  '006-penguin.svg',
  '006-sloth.svg',
  '007-eagle.svg',
  '007-panda bear.svg',
  '008-cheetah.svg',
  '008-rhinoceros.svg',
  '009-shark.svg',
  '009-wolf.svg',
  '010-cow.svg',
  '010-ferret.svg',
  '011-deer.svg',
  '011-hippopotamus.svg',
  '012-dog.svg',
  '012-tiger.svg',
  '013-pig.svg',
  '013-polar bear.svg',
  '014-snake.svg',
  '014-wolf.svg',
  '015-fox.svg',
  '015-parrot.svg',
  '016-lion.svg',
  '016-monkey.svg',
  '017-horse.svg',
  '017-spanish.svg',
  '018-boar.svg',
  '018-wild boar.svg',
  '019-hedgehog.svg',
  '019-tiger.svg',
  '020-lion.svg',
  '020-zebra.svg',
  '021-hippopotamus.svg',
  '021-owl.svg',
  '022-elephant.svg',
  '022-lemur.svg',
  '023-hen.svg',
  '023-rabbit.svg',
  '024-bat.svg',
  '024-frog.svg',
  '025-bear.svg',
  '025-crocodile.svg',
  '026-goat.svg',
  '026-panda bear.svg',
  '027-hamster.svg',
  '027-walrus.svg',
  '028-camel.svg',
  '028-chameleon.svg',
  '029-deer.svg',
  '029-duck.svg',
  '030-rhinoceros.svg',
  '030-walrus.svg',
  '031-beaver.svg',
  '031-swan.svg',
  '032-buffalo.svg',
  '032-giraffe.svg',
  '033-bull.svg',
  '033-eagle.svg',
  '034-elephant.svg',
  '034-llama.svg',
  '035-bear.svg',
  '035-snake.svg',
  '036-donkey.svg',
  '036-sloth.svg',
  '037-ostrich.svg',
  '037-puma.svg',
  '038-goose.svg',
  '038-hamster.svg',
  '039-racoon.svg',
  '039-turtle.svg',
  '040-camel.svg',
  '040-sheep.svg',
  '041-goat.svg',
  '041-llama.svg',
  '042-gorilla.svg',
  '042-lemur.svg',
  '043-kangaroo.svg',
  '043-penguin.svg',
  '044-polar bear.svg',
  '044-suricate.svg',
  '045-horse.svg',
  '045-owl.svg',
  '046-beaver.svg',
  '046-gorilla.svg',
  '047-anteater.svg',
  '047-frog.svg',
  '048-cheetah.svg',
  '048-squirrel.svg',
  '049-koala.svg',
  '049-sheep.svg',
  '050-koala.svg',
  '050-zebra.svg'
]

export const AVATAR_IDS = AVATAR_FILES.map((f) => String(f || '').replace(/\.[^.]+$/, ''))

const idToFile = new Map(AVATAR_FILES.map((f) => [String(f || '').replace(/\.[^.]+$/, ''), String(f || '')]))

const AVATAR_BASE_PATH = '/assets/image/avatar/wildlife'

function normalizePresetName(rawIdOrFile) {
  const text = toText(rawIdOrFile)
  if (!text) return ''
  const file = text.replace(/^.*\//, '').replace(/\.[^.]+$/, '')
  // Strip numeric prefix like "001-".
  const name = file.replace(/^\d+-/, '')

  const lowered = name.toLowerCase().trim()
  // Small legacy synonym helpers.
  if (lowered === 'rhino') return 'rhinoceros'
  if (lowered === 'racoon') return 'raccoon'
  return lowered
}

const nameToId = (() => {
  const map = new Map()
  for (const id of AVATAR_IDS) {
    const name = normalizePresetName(id)
    if (!name) continue
    if (!map.has(name)) map.set(name, id)
  }
  return map
})()

function toText(v) {
  return String(v ?? '').trim()
}

export function avatarSrcFromId(id) {
  const key = toText(id)
  if (!key) return ''
  const file = idToFile.get(key)
  if (!file) return ''
  return `${AVATAR_BASE_PATH}/${file}`
}

/**
 * Normalize a raw stored avatar value to a preset id (or "" if not preset).
 * Accepts:
 * - "001-elephant" (id)
 * - "001-elephant.svg" (filename)
 * - "/assets/image/avatar/001-elephant.svg" (legacy stored path)
 * - "/assets/image/avatar/wildlife/001-cat.svg" (current stored path)
 */
export function avatarIdFromValue(raw) {
  const v = toText(raw)
  if (!v) return ''

  // Already an id.
  if (idToFile.has(v)) return v

  // Filename.
  const file = v.replace(/^.*\//, '')
  const id = file.replace(/\.[^.]+$/, '')
  if (idToFile.has(id)) return id

  // Best-effort legacy migration by matching the animal name.
  const legacyName = normalizePresetName(v)
  const mapped = nameToId.get(legacyName)
  if (mapped && idToFile.has(mapped)) return mapped

  return ''
}

export function isPresetAvatarValue(raw) {
  return Boolean(avatarIdFromValue(raw))
}
