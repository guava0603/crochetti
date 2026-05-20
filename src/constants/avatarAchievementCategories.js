import { AVATAR_IDS, avatarNameFromId } from '@/constants/avatarPresets'
import { toTrimmedText as toText, uniqueTrimmedStrings as uniqueStrings } from '@/utils/text'

/**
 * Avatar category name sets.
 *
 * Note: these are based on the normalized animal name (see `avatarNameFromId`).
 * If you add new avatar files, update these sets as needed.
 */
export const AVATAR_ACHIEVEMENT_NAME_SETS = Object.freeze({
  flying: new Set([
    // Birds + other flying animals
    'bat',
    'duck',
    'eagle',
    'goose',
    'hen',
    'ostrich',
    'owl',
    'parrot',
    'penguin',
    'swan'
  ]),

  forest: new Set([
    'anteater',
    'bear',
    'beaver',
    'boar',
    'deer',
    'fox',
    'hedgehog',
    'koala',
    'raccoon',
    'squirrel',
    'wild boar'
  ]),

  bugs: new Set([
    // Currently no bug avatars shipped; keep the set for future expansion.
    'bee',
    'butterfly',
    'ladybug',
    'ant',
    'dragonfly'
  ]),

  sea: new Set([
    'shark',
    'turtle',
    'walrus'
  ])
})

/**
 * Return the list of preset avatar IDs required for a category achievement.
 *
 * Returns an empty array if no preset avatars match the category set.
 */
export function requiredAvatarIdsForCategory(categoryId) {
  const key = toText(categoryId)
  const nameSet = AVATAR_ACHIEVEMENT_NAME_SETS[key]
  if (!nameSet) return []

  return uniqueStrings(
    AVATAR_IDS.filter((id) => nameSet.has(avatarNameFromId(id)))
  )
}

export function hasUsedAllAvatarsForCategory(usedAvatarIds, categoryId) {
  const required = requiredAvatarIdsForCategory(categoryId)
  if (required.length === 0) return false

  const usedSet = new Set(uniqueStrings(usedAvatarIds))
  for (const id of required) {
    if (!usedSet.has(id)) return false
  }
  return true
}
