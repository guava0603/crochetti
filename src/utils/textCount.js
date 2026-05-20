import { toTrimmedText } from '@/utils/text'

export { toTrimmedText }

export function countChars(text) {
  return String(text ?? '').length
}

// Count CJK characters as 1 each; count other letter/number sequences as 1.
// This approximates "word count" across mixed languages.
export function countWordsLike(text) {
  const s = toTrimmedText(text)
  if (!s) return 0

  try {
    const matches = s.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}]+/gu
    )
    return matches ? matches.length : 0
  } catch {
    // Fallback: split on whitespace.
    return s.split(/\s+/).filter(Boolean).length
  }
}
